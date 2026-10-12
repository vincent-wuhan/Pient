#!/usr/bin/env python3
"""把 monorepo 里的 upup 垂域插件打成随 APK 预置的自包含包（assets/pient-upup.tgz）。

自包含 = 包目录内带 node_modules/（@benyue/pient-plugin-sdk + typebox）：
SDK 未发 npm，设备端 `pi install /root/.pient-preload/upup` 不能走 registry 解析依赖。
pi 通道主 barrel 已不含 MCP 装配器（monorepo e627462），无需 @modelcontextprotocol/sdk。

用法：
    pack_upup_asset.py --monorepo <path> --out <path>/pient-upup.tgz
"""
from __future__ import annotations

import argparse
import pathlib
import shutil
import tarfile


def log(msg: str) -> None:
    print(f"[pack_upup] {msg}", flush=True)


def build_stage(mono: pathlib.Path, stage: pathlib.Path) -> None:
    pkg = mono / "packages" / "upup"
    pkg_json = pkg / "package.json"
    if not pkg_json.is_file():
        raise SystemExit(f"monorepo upup 包不存在：{pkg}")
    sdk = mono / "packages" / "plugin-sdk"
    typebox = mono / "node_modules" / "typebox"
    for required, why in ((pkg, "upup 包"), (sdk, "plugin-sdk"), (typebox, "typebox")):
        if not required.is_dir():
            raise SystemExit(f"缺少 {why}：{required}")

    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)

    for item in (
        "package.json", "pient-plugin.json", "extensions", "skills", "src", "dist", "bin",
        "README.md", "THIRD_PARTY_NOTICES.md",
    ):
        src = pkg / item
        if src.is_dir():
            shutil.copytree(src, stage / item)
        elif src.is_file():
            shutil.copy2(src, stage / item)
        else:
            raise SystemExit(f"upup 包缺文件：{src}")

    nm = stage / "node_modules"
    (nm / "@benyue").mkdir(parents=True)
    shutil.copytree(sdk, nm / "@benyue" / "pient-plugin-sdk", ignore=shutil.ignore_patterns("tests", "node_modules"))
    shutil.copytree(typebox, nm / "typebox")
    log(f"stage 完成：{stage}（{sum(1 for _ in stage.rglob('*'))} 项）")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--monorepo", required=True)
    ap.add_argument("--out", required=True, help="输出 tgz 路径（如 generated/pientAssets/pient-upup.tgz）")
    args = ap.parse_args()

    mono = pathlib.Path(args.monorepo).resolve()
    out = pathlib.Path(args.out).resolve()
    stage = mono.parent / ".pient-upup-stage" / "benyue-upup-pient-plugin"
    # stage 放 monorepo 仓库外，避免污染工作树
    build_stage(mono, stage)

    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()
    with tarfile.open(out, "w:gz") as tar:
        tar.add(stage, arcname="benyue-upup-pient-plugin")
    log(f"打包完成：{out}（{out.stat().st_size // 1024}KB）")


if __name__ == "__main__":
    main()
