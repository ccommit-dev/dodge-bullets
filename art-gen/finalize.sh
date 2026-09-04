#!/usr/bin/env bash
# 생성 원화 배치 → 아틀라스·시트 재조립 → 용량 최적화. 배치 스크립트가 끝난 뒤 실행.
set -e
cd "$(dirname "$0")/.."
have() { ls art-gen/out/$1 >/dev/null 2>&1; }

for id in luna volt bronn iris cain sylph orion ember; do
  have "char-$id-hit.png" && node scripts/place-art.mjs char $id
done
have "hero-attack-3.png" && node scripts/place-art.mjs hero
for id in ember frost; do have "costume-$id-attack-3.png" && node scripts/place-art.mjs costume $id; done
# 보스 피격·처치: img2img(강도 .45/.55)는 원본과 거의 같거나(골렘·와이번) 정체성이 깨져(달늑대) 포즈로 읽히지 않는다 —
# 절차적 파생(make-monster-states)을 유지한다. 원화가 생기면 place-art.mjs boss <stem> 으로 개별 배치.
# for stem in moss-golem-clean moon-wolf-king-clean wolf-king-clean flame-wyvern-clean abyss-titan; do
#   have "boss-$stem-defeat.png" && node scripts/place-art.mjs boss $stem
# done
for f in art-gen/out/cover-*.png; do [ -e "$f" ] && node scripts/place-art.mjs cover "$(basename "$f" .png | sed 's/^cover-//')"; done

# 아틀라스·개별 PNG 재조립 (authored 행 우선), 영웅 기반 스킨(흑요석·새벽) 재파생, 몬스터 파생 프레임(authored 제외)
node scripts/make-variant-atlas.mjs
node scripts/make-variant-standalone.mjs
node scripts/make-character-skins.mjs
node scripts/make-monster-states.mjs
node scripts/optimize-assets.mjs | tail -1
echo "FINALIZE DONE"
