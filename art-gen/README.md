# 로컬 원화 생성 (art-gen)

RTX 5060 Ti 16GB에서 SDXL로 동료·영웅·보스·커버 원화를 만든다. 생성물은 기존 교체 경로에 같은 파일명으로 꽂는다.

## 설치

```bash
py -3.12 -m venv art-gen/.venv
art-gen/.venv/Scripts/python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
art-gen/.venv/Scripts/python -m pip install -r art-gen/requirements.txt
art-gen/.venv/Scripts/python art-gen/gen.py smoke   # out/smoke.png 가 나오면 성공
```

모델 가중치는 `art-gen/hf-cache/`에 내려받는다 (SDXL base 6.9GB · ControlNet OpenPose 2.5GB · IP-Adapter 1.7GB · Annotators). `.venv/ hf-cache/ out/`는 git 제외.

## 화풍 앵커

- 참조: `art-gen/ref/<ally>-idle.png` 6장 (기본 동료 아틀라스 idle 셀) → IP-Adapter plus(ViT-H) scale 0.55
- 프롬프트 공통부·네거티브·시드(20260904)는 `gen.py STYLE/NEG/BASE_SEED`에 고정
- 포즈: 같은 아틀라스의 4상태 셀에서 OpenPose 골격 추출 → ControlNet 0.8. "같은 자세, 다른 디자인"이 나온다

## 배치

`node scripts/place-art.mjs` 가 `art-gen/out/`의 결과를 아틀라스 행·개별 PNG·시트로 조립해 `public/`에 넣는다.
그 뒤 `node scripts/optimize-assets.mjs` → 검증 스위트 → 커밋.

## 배치 실행

```bash
nohup bash art-gen/run-all.sh > art-gen/run-all.log 2>&1 &   # 동료 8명 → 영웅 → 보스 5 → 코스튬 2 → 커버 16 (약 40분, 5060 Ti)
bash art-gen/finalize.sh                                       # 배치 → 아틀라스·시트 재조립 → 최적화
```

배치 스크립트는 이미 나온 결과(`out/…`)를 건너뛰므로 중단 후 다시 돌리면 이어서 한다. 특정 캐릭터만 다시 뽑으려면 `out/char-<id>-*.png`를 지우고 재실행한다.

## 재생성 안전장치 (authored 우선)

| 생성물 | 배치 위치 | 파생 스크립트가 건너뛰는 근거 |
|---|---|---|
| 동료 4상태 | `allies/authored/<id>-row.png` + `allies/<id>.png` | make-variant-atlas / make-variant-standalone: authored 행 존재 |
| 보스 피격·처치 | `monsters/<stem>-hit.png · -defeat.png` | make-monster-states: `monsters/authored.json` |
| 코스튬 시트 | `character/skins/hero-*-<id>.png` | make-character-skins: `character/skins/authored.json` |
| 영웅 시트 | `character/base/hero-idle.png · hero-attack.png` | (원본 교체 — 흑요석·새벽 스킨은 새 시트에서 재파생) |
| 커버 | `beat/covers/<id>.png` | make-beat-covers 를 다시 돌리지 않는다 |

## 플레이 검증

```bash
node scripts/verify-play-art.mjs   # dev 서버 5173 필요
```

새 원화 동료 4명(루나·브론·아이리스·엠버)을 편성해 전투를 돌리며 동료끼리·동료-주인공·동료-몬스터 본체 겹침, 전장 이탈, 상태 프레임 전환, 상태 간 크기 팝을 잰다. 스크린샷은 `art-gen/out/play-t*.png`.
이 검증에서 확정된 것: 교전 위치 표(`SpriteArt.tsx MELEE_COMBAT/RANGED_COMBAT`, 줄에 따른 깊이 z), 생성 동료의 무기 오버레이 생략(`AUTHORED_WEAPON_BAKED`), `place-art.mjs`의 파편 제거·배율 상한 규칙.
