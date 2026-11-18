# 게임플레이 테스트 에이전트 POC

비버 키우기 웹 빌드를 스스로 돌아다니며 문제를 찾고(탐색), 기획 · 패치 노트의 주장이 맞는지 확인하는(검증) 에이전트입니다.
정해진 순서대로 누르는 자동 검사(`scripts/verify-*.mjs`)는 관문으로 그대로 두고, 에이전트는 **발견**에만 씁니다. 찾은 것은 재현 스크립트로 굳혀 관문에 더합니다.

설계 — 연결 규격 · 계획기 · 실행기 · 판정기 · 기억 · 결과 여섯 칸(아래 구조 표). 연결 규격만 맞추면 안드로이드(adb) · 엔진 게임에도 같은 계획기 · 판정기를 쓴다.

## 실행

dev 서버가 떠 있어야 합니다. 기본은 `http://localhost:5173`(`.claude/launch.json` 의 `vite`). 다른 검사가 그 서버를 쓰는 중이면 `AGENT_BASE=http://127.0.0.1:5175`(`vite-device`)처럼 다른 서버로 돌립니다. 부하에 민감한 전체 검사와 같은 서버를 쓰면 그쪽 고정 대기가 깨진다.

```bash
node game-agent/run.mjs explore --steps 150 --minutes 10 --seed 1
node game-agent/run.mjs faults --steps 40
node game-agent/run.mjs verify
node game-agent/run.mjs repro game-agent/runs/<판 폴더>
node game-agent/run.mjs screens --set all
node game-agent/run.mjs scenario --runs 3
node game-agent/run.mjs scenario --only rift-run --regress rift-chip
node game-agent/run.mjs stats
```

| 명령 | 하는 일 |
|---|---|
| explore | 안 가 본 화면 · 안 눌러 본 단추부터 누르며 규칙 판정으로 문제 후보를 줍는다. 기억(화면 지도)은 판을 넘어 쌓인다 |
| faults | 일부러 넣은 버그 4종(예외 · 무반응 단추 · 재화 음수 · NaN 표시) + 대조군 — 판정기가 잡는지 |
| verify | `requests/claims.json` 의 주장마다 목표 단추를 스스로 찾아가 누르고 전후 상태로 참 · 거짓 판정. 정답(answer)과 견줘 정답률 |
| repro | 판의 이슈마다 리셋 → 같은 행동으로 다시 돌려 재현 여부를 재고, 재현 스크립트(`repro-I#.mjs`) · 이슈 초안(`issue-I#.md`)을 쓴다 |
| scenario | 시나리오 — 긴 흐름(균열 한 판 · 파견 · 도감 둘러보기 …)을 마일스톤으로 나눠, 마일스톤마다 저장 · DOM · 화면 규칙 표식으로 판정한다. 시험 하나 = 저장 심기(GM 초기화) + 목표 + 완료 판정 + 종료 규칙(miHoYo Gamer 7.3절의 틀). 단계의 목표 단추는 에이전트가 스스로 찾는다. `--runs` 로 여러 판 → 마일스톤 정확도 · 끝까지 완료 비율, `--regress` 로 고친 화면 버그를 CSS 로 되살려 그 마일스톤이 실패로 잡히는지 확인(`faults.mjs` SCENARIO_REGRESSIONS) |
| screens | 화면 벤치 — 정해진 화면 20곳에 화면 버그 10종(같은 색 글자 · 밀려난 단추 · 깨진 그림 · 기울어진 판 · 잘린 글자 · 떠다니는 그림 · NaN · 높이 0 목록 · 남은 어둠막 · 줄 높이 붕괴)을 넣고 규칙이 **대상을 맞는 종류로** 짚는지 잰다. `design`(11-10 과 같은 짝 20장) · `holdout`(다른 화면 · 시드 20장) |

결과는 `game-agent/runs/<시각>-<종류>/` 에 남고 저장소에는 올리지 않습니다(`report.md` · `issues.json` · `trace.jsonl` · `shots/`).

## 구조

설계 문서 5.2 와 같은 칸입니다. 저장소 안에 tsconfig 를 두면 vite 가 deps 캐시를 비우므로(메모리 · ci-local 주석) 설계의 `.ts` 대신 `scripts/` 처럼 `.mjs` 로 썼습니다.

| 폴더 | 파일 | 역할 |
|---|---|---|
| bridge | protocol.mjs | 연결 규격 — 관찰 · 행동 · 리셋 · 시간 · 사건 |
| | web-cdp.mjs | 웹 어댑터(헤드리스 Chrome). 상태는 저장(localStorage), 누를 것은 DOM, 터치는 좌표 |
| | presets.mjs | 리셋용 저장 상태(fresh · mid · qa) + 저장 덧붙이기(`applyPatch` — 시나리오의 GM 초기화, `"$now+8h"` 시각 표기) |
| | faults.mjs | 판정기 시험용 주입 버그 — 탐색 판에 심는 4종 + 지금 화면에 넣는 화면 버그 10종(`applyScreenFault`) |
| | visual-probe.mjs | 화면 구조 검사(페이지 안) — 깨진 그림 · 대비 2 미만 글자 · 숨김 상자에 잘린 글자 · 글자 겹침 · 높이 0 으로 접힌 상자. 문턱 · 측정 뒤 고친 것은 머리말 |
| bench | screens.mjs | 화면 벤치 — 화면 가는 길 · 세트 · 대상 맞춤 채점 |
| planner | plan.mjs | 요청 → 계획(탐색 · 검증) |
| executor | loop.mjs | 관찰 → 규칙 판정 → 판단 → 행동, 걸음 · 시간 상한 |
| | policy.mjs | 새로움 우선 탐색 · 목표 단추 찾기 · 아는 길(하네스) |
| | scenario.mjs | 시나리오 실행 — 마일스톤 잇기 · 판정 기다리기(`once` 는 잠깐 뜨는 연출용) · 판별 집계 |
| oracles | rules.mjs | 규칙 판정 — 예외 · 콘솔 오류 · 요청 실패 · NaN 표시 · 재화 불변식 · 빈 화면 · 가로 넘침 · 무반응 단추 · (11-13) 누를 것 없는 층이 단추를 덮음 · 화면 구조 검사 5종 |
| | judge.mjs | 검증 질문 · 마일스톤 판정(상태 증감 · 범위 · 화면 글자 · 선택자 그려짐/글자/읽힘) |
| memory | store.mjs | 화면 지도(화면 → 단추 → 다음 화면) · 눌러 본 횟수 · 막힌 길 |
| model | gateway.mjs | 자체 모델 게이트웨이(OpenAI 호환). `AGENT_MODEL_URL` 이 없으면 꺼짐 |
| report | record.mjs · repro.mjs · issue.mjs | 단계 기록 · 화면 · 재현 스크립트 · 이슈 초안 |
| requests | claims.json | 검증 질문(주장 · 누를 단추 · 판정 기준 · 사람이 정한 답 · 근거) |
| | scenarios.json | 시나리오 5개(차원 균열 · 주간 랭크 시험 · 동료 파견 · 마이페이지 도감 · 첫 성장) — 마일스톤 15개 |

## 안전장치

| 항목 | 설계 |
|---|---|
| 외부 전송 | 개발 서버 밖으로 나가는 요청은 막고 기록(`blocked`). 내려받기 거부, 새 창은 닫는다. 모델은 자체 게이트웨이 주소가 있을 때만, 보내는 것은 단추 이름 목록뿐 |
| 게임 소스 | 고치지 않는다. 주입 버그도 연결부가 페이지에 끼워 넣는다 |
| 누르지 않는 것 | 공유 · 카페 · 약관 · 종료 · 백업 · 초기화 · 계정 삭제 등(`policy.mjs` DENY) |
| 비용 상한 | 판마다 걸음 수 · 시간 · 모델 호출 수(`AGENT_MODEL_MAX_CALLS`, 기본 40) |
| 판정 | 규칙 판정이 먼저. 무반응은 한 번 더 눌러 확인한 뒤에만 후보로 |
| 이슈 | 초안만 만든다. 사람이 승인한 것만 이슈 관리 도구로 옮긴다 |

## 한계(POC)

- 모델이 없어(자체 게이트웨이 미확인) 검증 질문은 구조화된 JSON 으로 받는다. 자연어 → JSON 은 게이트웨이가 생기면 모델이 맡는다
- 캔버스 화면(비트 · 원정 전투)은 DOM 으로 결과가 안 보여 무반응 판정을 쉰다. 그 안의 전투 판정은 `window.__dodgeWorld` 같은 게임 쪽 노출이 필요하다(설계 5.2 game-hooks, 2단계)
- 같은 dev 서버를 다른 검사와 같이 쓴다. 서버가 다시 뜨면 판이 끊긴다
- 화면 구조 검사(11-13)가 못 보는 것 — 기울어진 판 · 넘쳐 흐르는 상자 · 그림/캔버스 바탕 위 글자 · pointer-events:none 덮개. 이것은 큰 모델 확인 몫이다. 알려진 오탐: 접혀 안 보이는 글자를 겹침으로 셈(성문 방어 보급 화면)
- 시나리오는 화면 구성에 묶인다 — 단추 이름 · 선택자가 바뀌면 고쳐야 한다(11-18 dd53c90 에서 "카드를 펼치면 편성 판 숨김" · 머리 칭호가 안 보이게 바뀌어 마일스톤을 고쳤다). 보상 양 같은 경제 값은 자주 바뀌어 방향(+/−)만 본다
- 화면이 늘어 탐색 40걸음으로는 상점에 못 갈 때가 있다 — `faults` 의 crash 는 `--steps 80` 에서 잡았다(11-13)
