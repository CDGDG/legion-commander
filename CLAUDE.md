# NeoGames - Legion Commander

## Project Overview
액션 로그라이트 + 자동전투 병사 소환 웹 브라우저 게임.
플레이어가 직접 컨트롤하는 액션 캐릭터 + 대량의 자동전투 병사 군단이 함께 싸우는 "전쟁형 로그라이트".

## Tech Stack
- **Renderer**: PixiJS (WebGL 2D)
- **Game Loop**: Custom (requestAnimationFrame 기반)
- **Language**: TypeScript
- **Build**: Vite
- **AI/Physics**: Custom (분대 기반 최적화)

## Architecture Principles
- 병사는 분대(squad) 단위로 AI 틱 공유 (8~12명/분대)
- 오브젝트 풀링 필수 (적, 병사, 투사체, 이펙트)
- 공간 해싱(spatial hash)으로 근접 탐색 최적화
- 렌더: 배칭 + LOD (먼 유닛은 단순 도형/색 블롭)
- 충돌: soft overlap, 병사 간 통과 가능 (separation만)

## Game Design Quick Reference
- 한 판: ~10분, 3막 구조
- 병사 수: 100+ (물량이 핵심 쾌감)
- 적도 물량: 전쟁 느낌의 대규모 전투
- 버프: 임계치 기반 시너지 (3/6/12식)
- 5라운드마다 보스전
- 레벨업 시 병사 뽑기/강화 선택지

## Key Files
- `docs/GDD.md` - Game Design Document (전체 기획서)
- `src/` - 게임 소스코드 (추후 생성)

## Workflow
- codex-collab 스킬로 Codex와 협업 (plan/review/brainstorm)
- 브레인스토밍 로그: `.codex-collab/BRAINSTORM.md`
