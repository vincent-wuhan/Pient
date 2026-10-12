#!/usr/bin/env python3
"""列出目录内 ELF 共享库的 DT_SONAME 映射，供 Pient 构建期生成运行时库映射表。

用法：elf_soname.py <dir>
输出（每行）："<soname> <filename>"；无 DT_SONAME 时 soname 回退为文件名。

背景：jniLibs 打包要求 lib*.so 命名且只收实际文件，deb 里的 SONAME 软链
（如 libtalloc.so.2 → libtalloc.so.2.5.0）会丢。设备侧 ensureLinks 按本表
在 usr/lib 重建软链，表里的链接名必须是 loader 真正查找的 SONAME——
用文件名（libtalloc.so.2.5.0）会导致 "cannot link executable: libtalloc.so.2
not found"。无外部依赖，纯 struct 解析。
"""
import struct
import sys
from pathlib import Path


def dt_soname(data: bytes) -> str | None:
    if data[:4] != b"\x7fELF":
        return None
    is64 = data[4] == 2
    if is64:
        (e_shoff,) = struct.unpack_from("<Q", data, 0x28)
        (e_shentsize,) = struct.unpack_from("<H", data, 0x3A)
        (e_shnum,) = struct.unpack_from("<H", data, 0x3C)
        (e_shstrndx,) = struct.unpack_from("<H", data, 0x3E)
    else:
        (e_shoff,) = struct.unpack_from("<I", data, 0x20)
        (e_shentsize,) = struct.unpack_from("<H", data, 0x2E)
        (e_shnum,) = struct.unpack_from("<H", data, 0x30)
        (e_shstrndx,) = struct.unpack_from("<H", data, 0x32)

    def section(i: int) -> tuple[int, int, int, int]:
        off = e_shoff + i * e_shentsize
        if is64:
            name = struct.unpack_from("<I", data, off)[0]
            typ = struct.unpack_from("<I", data, off + 4)[0]
            offset, size = struct.unpack_from("<QQ", data, off + 24)
        else:
            name, typ = struct.unpack_from("<II", data, off)
            offset, size = struct.unpack_from("<II", data, off + 16)
        return name, typ, offset, size

    if e_shstrndx >= e_shnum:
        return None
    _, _, shstr_off, shstr_size = section(e_shstrndx)

    def cstr_at(base: int, offset: int) -> str:
        end = data.index(b"\0", base + offset)
        return data[base + offset:end].decode("utf-8", "replace")

    dynstr_tabs = [
        (offset, size)
        for i in range(e_shnum)
        if section(i)[1] == 3  # SHT_STRTAB
        for (_, typ, offset, size) in [section(i)]
    ]

    for i in range(e_shnum):
        name_off, _, offset, size = section(i)
        if name_off >= shstr_size:
            continue
        if cstr_at(shstr_off, name_off) != ".dynamic":
            continue
        entsz = 16 if is64 else 8
        pos = offset
        while pos + entsz <= offset + size:
            if is64:
                tag, val = struct.unpack_from("<qQ", data, pos)
            else:
                tag, val = struct.unpack_from("<iI", data, pos)
            if tag == 0:
                break
            if tag == 14:  # DT_SONAME：偏移相对 .dynstr；按名字找串表不可靠
                # （section 名表本身也是 strtab，同名查找易错位），遍历所有
                # SHT_STRTAB 取第一个能解出非空 lib*.so 形态的候选。
                for base, span in dynstr_tabs:
                    if val >= span:
                        continue
                    cand = cstr_at(base, val)
                    if cand.startswith("lib") and ".so" in cand:
                        return cand
                return None
            pos += entsz
    return None


def main() -> None:
    lib_dir = Path(sys.argv[1])
    for f in sorted(lib_dir.iterdir()):
        if not f.is_file() or not (f.name.endswith(".so") or ".so." in f.name):
            continue
        try:
            soname = dt_soname(f.read_bytes())
        except OSError:
            continue
        print(f"{soname or f.name} {f.name}")


if __name__ == "__main__":
    main()
