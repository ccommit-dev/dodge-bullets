#!/usr/bin/env bash
# 비버 테마 13차 — 12차에서 CUBLAS 오류로 빠진 것(abyss 배경 · 비트 무대 2번 시드 등)을 같은 스크립트로 한 번 더 (have() 가 있는 건 건너뛴다). ALL_DONE12 뒤에 돈다
set -u
until grep -q ALL_DONE12 art-gen/batch-beaver12.log 2>/dev/null; do sleep 30; done
sed 's/^until grep -q ALL_DONE11.*$/true/; s/^echo ALL_DONE12$/echo ALL_DONE13/' art-gen/batch-beaver12.sh > art-gen/out/_batch13-run.sh
bash art-gen/out/_batch13-run.sh
