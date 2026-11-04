# Two Storms (HD)

32초짜리 애니메이션 단편. `index.html` 하나에 영상(MP4, base64)이 들어 있어서 브라우저로 열면 바로 재생됩니다.

영상 파일은 사람이 그리거나 생성 AI로 만든 것이 아니라, `src/film.html`의 코드가 프레임마다 그린 그림과
Web Audio로 합성한 소리를 오프라인으로 렌더링해 인코딩한 것입니다.

## 다시 렌더링하기

```bash
cd two-storms-hd/src
node render.js /tmp/two-storms-work   # 프레임 768장 → 오디오 → ffmpeg → ../index.html
```

필요한 것: Node, Playwright(Chromium), ffmpeg(libx264, aac).

- `src/film.html` — 장면, 캐릭터, 효과, 소리를 모두 그리는 렌더러. 그냥 열면 저화질 실시간 미리보기, `?t=초`를 붙이면 그 시점의 완성 프레임.
- `src/render.js` — 헤드리스 브라우저 4개로 프레임을 나눠 그리고, 음악을 합성하고, MP4로 인코딩해 플레이어에 넣음.
- `src/player.html` — 재생 페이지 템플릿(`moss-keeper`와 같은 형식).

실시간 버전과 달리 프레임 하나에 시간을 들일 수 있어서, 여러 시점을 겹쳐 그린 모션 블러, 블룸,
심도 흐림, 림 라이트, 종이 질감, 색 보정을 넣었습니다.
