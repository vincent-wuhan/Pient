#!/usr/bin/env python3
"""下载官方 Node.js v22（>=22.19）linux 二进制并转成 .tgz，供 Pient 随 APK 预置。

为什么转换：node 官方分发是 .tar.xz；aapt 会自动解压 assets 里的 *.gz 并去后缀（30MB
变 84MB 的坑，见 fetch_rootfs 同款注释），所以统一重打包为 .tar.gz（Pient 约定 .tgz）。

用法：
    fetch_node.py --abi arm64            # 下载最新 v22.x（>=22.19）到 runtime/cache/node/
    fetch_node.py --abi arm64 --version v22.20.0
输出：runtime/cache/node/node-linux-<abi>.tgz（保留 node-vX-linux-<abi>/ 顶层目录，
设备端 tar --strip-components=1 解到 /usr/local/）
"""
from __future__ import annotations

import argparse
import gzip
import json
import pathlib
import shutil
import sys
import tarfile
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = ROOT / "runtime" / "cache" / "node"
MIRROR_INDEX = "https://registry.npmmirror.com/-/binary/node/"
NODEJS_INDEX = "https://nodejs.org/dist/index.json"
MIN_VERSION = (22, 19, 0)


def log(msg: str) -> None:
    print(f"[fetch_node] {msg}", flush=True)


def fetch_json(url: str):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode())


def pick_version(pinned: str | None) -> str:
    if pinned:
        return pinned
    versions: list[str] = []
    for url in (MIRROR_INDEX, NODEJS_INDEX):
        try:
            data = fetch_json(url)
            # npmmirror 索引 = [{"name": "v22.14.0/", ...}]；nodejs.org = [{"version": "v22.14.0"}]
            versions = [
                (item.get("name") or item.get("version") or "") if isinstance(item, dict) else str(item)
                for item in data
            ]
            break
        except Exception as e:  # noqa: BLE001 — 镜像失败换下一个
            log(f"索引拉取失败 {url}: {e}")
    usable = []
    for v in versions:
        v = v.strip().rstrip("/")
        parts = v.lstrip("v").split(".")
        if len(parts) != 3 or not all(p.isdigit() for p in parts):
            continue
        if not v.startswith("v22."):
            continue
        if tuple(int(p) for p in parts) >= MIN_VERSION:
            usable.append(v)
    if not usable:
        raise SystemExit(f"未找到 >= {MIN_VERSION} 的 v22 版本（索引共 {len(versions)} 项）")
    best = max(usable, key=lambda v: tuple(int(p) for p in v.lstrip("v").split(".")))
    return best


def download(url: str, dest: pathlib.Path) -> None:
    log(f"下载 {url}")
    with urllib.request.urlopen(url, timeout=120) as r, dest.open("wb") as f:
        shutil.copyfileobj(r, f)


def repack_xz_to_tgz(xz_path: pathlib.Path, tgz_path: pathlib.Path) -> None:
    with tarfile.open(xz_path, "r:xz") as src, tarfile.open(tgz_path, "w:gz") as dst:
        for member in src:
            dst.addfile(member, src.extractfile(member) if member.isfile() else None)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--abi", required=True, choices=["arm64", "x86_64"])
    ap.add_argument("--version", default=None, help="如 v22.20.0；缺省取最新 v22（>=22.19）")
    args = ap.parse_args()

    version = pick_version(args.version)
    CACHE.mkdir(parents=True, exist_ok=True)
    out = CACHE / f"node-linux-{args.abi}.tgz"
    if out.is_file():
        log(f"已有缓存 {out}（删除后重跑可强制刷新）")
        return

    for base in (MIRROR_INDEX, "https://nodejs.org/dist/"):
        url = f"{base}{version}/node-{version}-linux-{args.abi}.tar.xz"
        with tempfile.TemporaryDirectory() as td:
            xz = pathlib.Path(td) / "node.tar.xz"
            try:
                download(url, xz)
            except Exception as e:  # noqa: BLE001
                log(f"下载失败 {url}: {e}")
                continue
            repack_xz_to_tgz(xz, out)
            log(f"完成：{out}（{out.stat().st_size // 1024 // 1024}MB, node {version} {args.abi}）")
            return
    raise SystemExit(f"node {version} linux-{args.abi} 全部源下载失败")


if __name__ == "__main__":
    main()
