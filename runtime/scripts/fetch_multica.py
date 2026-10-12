#!/usr/bin/env python3
"""下载 multica-cli（multica-ai/multica 官方 GitHub Release）linux 二进制并重打包为 .tgz，
供 Pient 随 APK 预置（multica 聊天控制通道的设备端 CLI）。

为什么重打包：官方分发就是 .tar.gz，但 aapt 会自动解压 assets 里的 *.gz 并去掉后缀
（同 fetch_node 注释里的坑），所以解开再压一次、按 Pient 约定落 .tgz。

用法：
    fetch_multica.py --abi arm64            # 下载 v0.6.1 到 runtime/cache/multica/
    fetch_multica.py --abi arm64 --mirror   # GitHub 直连失败时走 ghproxy 前缀
输出：runtime/cache/multica/multica-cli.tgz（官方归档是扁平 tar：成员即
LICENSE/NOTICE/README.md/README.zh.md/multica，其中 `multica` 为 Go CLI 二进制）
"""
from __future__ import annotations

import argparse
import pathlib
import shutil
import sys
import tarfile
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = ROOT / "runtime" / "cache" / "multica"
GHPROXY = "https://ghproxy.com/"

# TODO(x86_64)：multica Release 目前只发 linux-arm64；上游出 amd64 后在 VERSIONS 里补
#   "x86_64": "multica-cli-<version>-linux-amd64.tar.gz" 即可。
VERSION = "v0.6.1"
ASSET = {
    "arm64": f"multica-cli-{VERSION.removeprefix('v')}-linux-arm64.tar.gz",
}


def log(msg: str) -> None:
    print(f"[fetch_multica] {msg}", flush=True)


def download(url: str, dest: pathlib.Path) -> None:
    log(f"下载 {url}")
    with urllib.request.urlopen(url, timeout=120) as r, dest.open("wb") as f:
        shutil.copyfileobj(r, f)


def repack_targz_to_tgz(gz_path: pathlib.Path, tgz_path: pathlib.Path) -> None:
    """解开官方 .tar.gz 再压回 gzip tgz（规避 aapt 对 assets/*.gz 的自动解压），
    成员校验由 check_members 负责。"""
    with tarfile.open(gz_path, "r:gz") as src, tarfile.open(tgz_path, "w:gz") as dst:
        for member in src:
            dst.addfile(member, src.extractfile(member) if member.isfile() else None)


def check_members(tgz_path: pathlib.Path, abi: str) -> None:
    """成员校验：实测 multica Release 是**扁平 tar**（无顶层目录，成员 = LICENSE/NOTICE/
    README/multica），所以「路径段 linux-arm64」那条行不通，改为更强校验：必须存在名为
    `multica` 的文件，且是目标 ABI 的 ELF（e_machine：arm64=0xB7, x86_64=0x3E）。"""
    with tarfile.open(tgz_path) as tf:
        names = tf.getnames()
        m = tf.extractfile("multica")
        if m is None:
            raise SystemExit(f"归档内找不到名为 multica 的 CLI 二进制（成员：{names}）")
        head = m.read(20)
    if head[:4] != b"\x7fELF":
        raise SystemExit(f"multica 成员不是 ELF 二进制（magic={head[:4]!r}，成员：{names}）")
    machine = head[18] | (head[19] << 8)
    expected = 0xB7 if abi == "arm64" else 0x3E
    if machine != expected:
        raise SystemExit(f"multica ELF e_machine=0x{machine:X}，与目标 abi={abi}（0x{expected:X}）不符")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--abi", default="arm64", choices=list(ASSET))
    ap.add_argument("--mirror", action="store_true", help="GitHub 直连失败时加 ghproxy 前缀重试")
    args = ap.parse_args()

    CACHE.mkdir(parents=True, exist_ok=True)
    out = CACHE / "multica-cli.tgz"
    if out.is_file():
        log(f"已有缓存 {out}（删除后重跑可强制刷新）")
        return

    asset = ASSET[args.abi]
    url = f"https://github.com/multica-ai/multica/releases/download/{VERSION}/{asset}"
    with tempfile.TemporaryDirectory() as td:
        gz = pathlib.Path(td) / "multica.tar.gz"
        try:
            download(url, gz)
        except Exception as e:  # noqa: BLE001 — 直连失败换镜像
            if not args.mirror:
                raise SystemExit(f"下载失败 {url}: {e}\n  可加 --mirror 走 ghproxy 重试")
            log(f"直连失败 {url}: {e} —— 改走 ghproxy")
            download(GHPROXY + url, gz)
        repack_targz_to_tgz(gz, out)
    check_members(out, args.abi)
    log(f"完成：{out}（{out.stat().st_size // 1024 // 1024}MB, multica {VERSION} {args.abi}）")


if __name__ == "__main__":
    main()
