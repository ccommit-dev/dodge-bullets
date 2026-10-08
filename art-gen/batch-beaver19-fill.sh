#!/usr/bin/env bash
# 19차 배경 빈칸(dodge1 — 첫 적재 때 MemoryError) 채우기. 캐릭터 프로브 뒤에 돈다
set -u
until grep -q ALL_DONE19CH art-gen/batch-beaver19-char.log 2>/dev/null; do sleep 30; done
sed 's/^until grep -q RELEASE_EXIT.*$/true/; s/^echo ALL_DONE19BG$/echo ALL_DONE19FILL/' art-gen/batch-beaver19-bg.sh > art-gen/out/_batch19-fill.sh
bash art-gen/out/_batch19-fill.sh
