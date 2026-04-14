# 무료 배포 가이드

## 10분 안에 끝내는 배포 (Vercel 무료)

### 1. GitHub에 코드 올리기

```bash
# 프로젝트 폴더에서
git add -A
git commit -m "ready to deploy"

# GitHub에 새 저장소 만든 뒤 (https://github.com/new)
git remote add origin https://github.com/YOUR_USERNAME/legion-commander.git
git push -u origin master
```

### 2. Vercel로 배포 (완전 무료, 신용카드 필요 없음)

1. https://vercel.com/signup 접속 → **Continue with GitHub** 클릭
2. 대시보드에서 **"Add New..." → "Project"**
3. 방금 만든 레포지토리 **Import**
4. 아무 설정도 건드리지 않고 **"Deploy"** 클릭
5. 약 1분 대기하면 `https://legion-commander-XXXX.vercel.app` 주소가 생김

끝. 이 주소를 친구들에게 공유하면 바로 플레이 가능.

- 코드를 수정 후 `git push` 하면 **자동 재배포**됨
- 커스텀 도메인을 원하면 Vercel 대시보드 → Settings → Domains에서 무료로 추가

---

## (선택) 글로벌 랭킹 활성화 (Supabase 무료)

기본 상태로도 랭킹은 작동합니다 (브라우저 로컬 저장 = 각자 본인 기록만 봄).
모든 플레이어가 **공유하는 글로벌 랭킹**을 원하면 Supabase를 연결하세요. 무료이고 신용카드 필요 없습니다.

### 1. Supabase 프로젝트 만들기

1. https://supabase.com → **Start your project** → GitHub 로그인
2. **New project** 클릭 → 이름/비밀번호 설정 (리전은 "Northeast Asia (Seoul)" 추천)
3. 프로젝트 생성 대기 (약 2분)

### 2. 테이블 생성

왼쪽 메뉴 **SQL Editor** → **New query** → 아래 복사/붙여넣기 → **Run**:

```sql
create table scores (
  id bigserial primary key,
  name text not null,
  score int not null,
  room int not null default 0,
  ascension int not null default 0,
  kills int not null default 0,
  weapon text not null default '',
  created_at timestamptz default now()
);
create index on scores(score desc);
alter table scores enable row level security;
create policy "anyone reads" on scores for select using (true);
create policy "anyone inserts" on scores for insert with check (true);
```

### 3. API 키 복사

왼쪽 메뉴 **Settings → API**에서:
- **Project URL** (`https://xxxxxx.supabase.co`)
- **anon public** 키 (`eyJhb...`)

### 4. Vercel에 환경변수 등록

1. Vercel 대시보드 → 프로젝트 선택 → **Settings → Environment Variables**
2. 두 개 추가:
   - `VITE_SUPABASE_URL` = 위에서 복사한 URL
   - `VITE_SUPABASE_ANON_KEY` = 위에서 복사한 anon 키
3. **Deployments** 탭으로 가서 최신 배포 옆 `⋯` → **Redeploy**

이제 타이틀 화면 🏆 랭킹 탭에 **"🌐 글로벌 랭킹"** 이라고 표시되고, 전 세계 플레이어의 점수가 공유됩니다.

---

## 대안: GitHub Pages (더 간단하지만 도메인이 길다)

GitHub 저장소에서 Settings → Pages → Source: `GitHub Actions` 선택하면 됩니다.
Vercel 쪽이 더 빠르고 커스텀 도메인 설정이 편합니다.

---

## 무료 한도 요약

- **Vercel**: 월 100GB 대역폭 (수천 명 접속 가능)
- **Supabase**: 50k 요청/월, 500MB 저장소 (충분)

두 서비스 모두 신용카드/결제 정보 없이 사용 가능합니다.
