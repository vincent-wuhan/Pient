#!/usr/bin/env python3
"""把 @amaster.ai/pi-teamwork npm 包（含依赖闭包）打成随 APK 预置的归档
（assets/pient-piteamwork.tgz），供设备端 multica 聊天控制通道使用。

与 pack_pi_archive.py 同思路：在 staging 里用本机 npm 真解析一遍依赖树，
把 node_modules/ 整个打进去（自包含，设备端 pi install 不走 registry）。

staging 幂等：stage/package.json 的依赖版本与本次一致且 node_modules 完整则跳过
npm 重装（--force 强制重建）。

用法：
    pack_piteamwork_asset.py --out <path>/pient-piteamwork.tgz
    pack_piteamwork_asset.py --out ... --force      # 丢弃 stage 重建
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = ROOT / "runtime" / "cache" / "piteamwork"
STAGE = CACHE / "stage"
NPM_CACHE = CACHE / "npm-cache"
PKG = "@amaster.ai/pi-teamwork"
VERSION = "0.1.24"
REGISTRIES = [
    "https://registry.npmmirror.com",      # 国内首选
    "https://registry.npmjs.org",          # 兜底
]


def log(msg: str) -> None:
    print(f"[pack_piteamwork] {msg}", flush=True)


def stage_is_reusable() -> bool:
    """staging 存在且 package.json 依赖版本匹配、且目标包已装上 → 可跳过 npm 重装"""
    pj = STAGE / "package.json"
    if not pj.is_file() or not (STAGE / "node_modules" / PKG / "package.json").is_file():
        return False
    try:
        deps = json.loads(pj.read_text(encoding="utf-8")).get("dependencies", {})
    except (OSError, ValueError):
        return False
    return deps.get(PKG) == VERSION


def npm_install() -> pathlib.Path:
    """在 STAGE 里装 pi-teamwork + 依赖闭包，返回 node_modules 目录"""
    nm = STAGE / "node_modules"
    STAGE.mkdir(parents=True, exist_ok=True)
    NPM_CACHE.mkdir(parents=True, exist_ok=True)
    (STAGE / "package.json").write_text(
        json.dumps(
            {"name": "pient-piteamwork-stage", "private": True,
             "dependencies": {PKG: VERSION}},
            indent=1,
        ) + "\n",
        encoding="utf-8",
    )
    last = None
    for reg in REGISTRIES:
        log(f"npm install {PKG}@{VERSION}（registry={reg}）")
        cmd = [
            "npm", "install", f"{PKG}@{VERSION}",
            "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund",
            "--loglevel=error", "--cache", str(NPM_CACHE), "--registry", reg,
        ]
        p = subprocess.run(cmd, cwd=str(STAGE), capture_output=True, text=True,
                           shell=(os.name == "nt"))
        if p.returncode == 0 and (nm / PKG / "package.json").is_file():
            log("npm install 完成")
            return nm
        last = (p.returncode, (p.stderr or p.stdout or "")[-400:])
        log(f"registry 失败：{last}")
    raise SystemExit(f"npm install 全部失败：{last}")


def hoist_entry(nm: pathlib.Path) -> None:
    """把真实的 @amaster.ai/pi-teamwork 包内容提到 staging 根。

    pi 通过根 package.json 的 `pi.extensions` 字段找扩展入口。
    staging 经 npm install 产出的根 package.json 是空壳（无 pi 字段）→
    pi 报 "Cannot find module '/root/.pient-preload/piteamwork'" 并崩溃。

    修复：复制真实包的 package.json（含 pi.extensions=["./dist/index.js"]）
    和 dist/ 目录到 staging 根，node_modules 保持原位供依赖解析。
    """
    real = nm / PKG
    real_pj = real / "package.json"
    if not real_pj.is_file():
        raise SystemExit(f"hoist_entry: 找不到真实包 {real_pj}")

    # 复制 dist/（扩展入口 ./dist/index.js 相对根解析）
    for item in real.iterdir():
        if item.name in ("node_modules", "package.json"):
            continue
        dst = STAGE / item.name
        if dst.exists():
            shutil.rmtree(dst) if dst.is_dir() else dst.unlink()
        if item.is_file():
            shutil.copy2(item, dst)
        else:
            shutil.copytree(item, dst)

    # 用真实 package.json 覆盖空壳（保留 dependencies 供 node_modules 解析一致性）
    real_meta = json.loads(real_pj.read_text(encoding="utf-8"))
    shell_meta = json.loads((STAGE / "package.json").read_text(encoding="utf-8"))
    merged = {**shell_meta, **real_meta}
    (STAGE / "package.json").write_text(
        json.dumps(merged, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    log("根 package.json 已替换为真实 pi-teamwork 入口（pi.extensions 就位）")


def pack(nm: pathlib.Path, out: pathlib.Path) -> None:
    """把 stage/ 内容打成 gzip tar，顶层目录名 `piteamwork`"""
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()
    with tarfile.open(out, "w:gz") as tar:
        tar.add(STAGE, arcname="piteamwork")
    log(f"打包完成：{out}（{out.stat().st_size / 1048576:.2f} MB）")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="输出 tgz 路径（如 generated/pientAssets/pient-piteamwork.tgz）")
    ap.add_argument("--force", action="store_true", help="丢弃 stage 重新 npm install")
    a = ap.parse_args()

    if shutil.which("npm") is None:
        raise SystemExit("npm 不在 PATH：pack_piteamwork_asset.py 需要本机 npm 解析依赖闭包")

    if a.force and STAGE.exists():
        log("--force：清掉 stage 重建")
        shutil.rmtree(STAGE)
    if stage_is_reusable():
        log("stage 版本匹配且完整，跳过 npm install（--force 重建）")
        nm = STAGE / "node_modules"
    else:
        nm = npm_install()

    # 执行后核对：npm 会装出 package.json 声明的依赖，目标包必须在
    if not (nm / PKG / "package.json").is_file():
        raise SystemExit(f"npm install 后仍缺 {nm / PKG} —— 安装未生效")

    hoist_entry(nm)

    out = pathlib.Path(a.out).resolve()
    pack(nm, out)

    # 自检：顶层目录 piteamwork + node_modules + 目标包都在
    with tarfile.open(out) as tf:
        names = tf.getnames()
    ok = (
        any(n.startswith("piteamwork/node_modules/") for n in names)
        and any(n == f"piteamwork/node_modules/{PKG}/package.json" for n in names)
    )
    log(f"自检：piteamwork/node_modules={any(n.startswith('piteamwork/node_modules/') for n in names)} "
        f"{PKG}={any(n == f'piteamwork/node_modules/{PKG}/package.json' for n in names)}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
