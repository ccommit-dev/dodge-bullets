#!/usr/bin/env bash
# 플레이 업로드 키스토어 만들기 (2026-10-02) — **사용자가 직접** 실행한다. 키는 저장소 밖(홈 폴더)에 만든다.
#
#   bash scripts/make-upload-keystore.sh
#
# 하는 일:
#   1. ~/dodgelab-upload.keystore 를 만든다 (이미 있으면 멈춘다 — 업로드 키를 잃으면 플레이 지원팀에 재설정을 요청해야 한다)
#   2. GitHub Secrets 에 넣을 값 네 개를 알려 준다. gh CLI 가 있으면 그대로 넣는 명령도 보여 준다(자동으로 넣지는 않는다)
# 키스토어 파일과 비밀번호는 저장소에 커밋하지 않는다 (android/.gitignore 가 *.keystore 를 막는다).
set -euo pipefail

KS="${HOME}/dodgelab-upload.keystore"
ALIAS="dodgelab"

if [ -f "$KS" ]; then
  echo "이미 있다: $KS — 덮어쓰지 않는다. 새로 만들려면 먼저 안전한 곳에 백업하고 지운다." >&2
  exit 1
fi
if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool 이 없다 — JDK 17 이상을 설치하거나 JAVA_HOME/bin 을 PATH 에 넣는다." >&2
  exit 1
fi

read -r -s -p "키스토어 비밀번호(6자 이상): " STOREPASS; echo
read -r -s -p "한 번 더: " STOREPASS2; echo
[ "$STOREPASS" = "$STOREPASS2" ] || { echo "비밀번호가 다르다." >&2; exit 1; }
[ "${#STOREPASS}" -ge 6 ] || { echo "6자 이상이어야 한다." >&2; exit 1; }

# 키 비밀번호는 키스토어 비밀번호와 같게 둔다 (PKCS12 는 둘이 같아야 한다)
keytool -genkeypair -v -storetype PKCS12 -keystore "$KS" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STOREPASS" -keypass "$STOREPASS" \
  -dname "CN=DODGE LAB, OU=Game, O=ccommit-dev, C=KR"

echo
echo "만들었다: $KS"
echo "이 파일과 비밀번호를 비밀번호 관리자 등 안전한 곳에 백업한다. 잃으면 업로드 키 재설정이 필요하다."
echo
echo "GitHub → Settings → Secrets and variables → Actions 에 네 개를 넣는다:"
echo "  KEYSTORE_BASE64   = 아래 명령의 출력"
echo "  KEYSTORE_PASSWORD = 방금 입력한 비밀번호"
echo "  KEY_ALIAS         = $ALIAS"
echo "  KEY_PASSWORD      = 방금 입력한 비밀번호 (같은 값)"
echo
echo "KEYSTORE_BASE64 값 만들기:"
echo "  base64 -w0 \"$KS\"    (macOS: base64 -i \"$KS\")"
if command -v gh >/dev/null 2>&1; then
  echo
  echo "gh CLI 로 넣으려면 (직접 확인 후 실행):"
  echo "  base64 -w0 \"$KS\" | gh secret set KEYSTORE_BASE64 -R ccommit-dev/dodge-bullets"
  echo "  gh secret set KEYSTORE_PASSWORD -R ccommit-dev/dodge-bullets"
  echo "  gh secret set KEY_ALIAS -R ccommit-dev/dodge-bullets --body $ALIAS"
  echo "  gh secret set KEY_PASSWORD -R ccommit-dev/dodge-bullets"
fi
echo
echo "넣은 뒤 main 에 푸시하면 Android Build 의 release-aab 잡이 서명된 AAB 를 아티팩트로 올린다."
