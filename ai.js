/* 옷짝 — Claude 비전으로 옷 사진을 정밀 분석한다.
 * 공식 SDK(@anthropic-ai/sdk 1.6.0)를 브라우저용으로 번들한 vendor/anthropic-sdk.js 를
 * 사용자가 AI 분석을 켰을 때만 동적으로 불러온다. API 키는 사용자의 것이며 브라우저에만 저장된다. */
(function () {
  'use strict';

  const MODEL = 'claude-opus-5-5';
  const E = window.Engine;
  let sdkPromise = null;
  function loadSdk() {
    if (!sdkPromise) {
      sdkPromise = import('./vendor/anthropic-sdk.js').catch(e => { sdkPromise = null; throw e; });
    }
    return sdkPromise;
  }

  // 구조화 출력 스키마: 엔진 결과와 같은 모양이라 화면에서 똑같이 그린다.
  const COLOR = { type: 'object', additionalProperties: false, required: ['hex', 'name'], properties: {
    hex: { type: 'string', description: '#rrggbb' }, name: { type: 'string', description: '한국어 색 이름(예: 네이비, 베이지)' } } };
  const SCHEMA = {
    type: 'object', additionalProperties: false, required: ['item', 'looks'],
    properties: {
      item: {
        type: 'object', additionalProperties: false,
        required: ['category', 'name', 'colors', 'style', 'season', 'pattern', 'material', 'summary'],
        properties: {
          category: { type: 'string', enum: E.CATEGORIES },
          name: { type: 'string', description: '옷을 부르는 짧은 이름(예: 네이비 울 코트)' },
          colors: { type: 'array', items: COLOR, description: '주요 색 1~3개, 면적이 큰 순서' },
          style: { type: 'string', enum: E.STYLES },
          season: { type: 'string', enum: E.SEASONS },
          pattern: { type: 'string', description: '무지/스트라이프/체크 등, 없으면 "무지"' },
          material: { type: 'string', description: '추정 소재, 모르면 빈 문자열' },
          summary: { type: 'string', description: '이 옷의 특징을 한 문장으로' },
        },
      },
      looks: {
        type: 'array',
        description: '서로 다른 콘셉트의 코디 3개',
        items: {
          type: 'object', additionalProperties: false, required: ['title', 'concept', 'items', 'tip'],
          properties: {
            title: { type: 'string', description: '룩 이름(예: 기본 룩, 톤온톤 룩, 포인트 룩)' },
            concept: { type: 'string', description: '한두 문장 콘셉트 설명' },
            tip: { type: 'string', description: '입을 때 팁 한 문장' },
            items: {
              type: 'array',
              description: '업로드한 옷을 제외한 나머지 칸의 아이템',
              items: {
                type: 'object', additionalProperties: false,
                required: ['slot', 'name', 'colorHex', 'colorName', 'reason'],
                properties: {
                  slot: { type: 'string', enum: E.SLOTS },
                  name: { type: 'string', description: '구체적인 아이템(예: 와이드 슬랙스)' },
                  colorHex: { type: 'string' },
                  colorName: { type: 'string' },
                  reason: { type: 'string', description: '왜 어울리는지 한 문장' },
                },
              },
            },
          },
        },
      },
    },
  };

  const SYSTEM = [
    '당신은 한국어로 답하는 퍼스널 스타일리스트입니다. 사용자가 올린 옷 사진 한 장을 보고 그 옷에 어울리는 코디를 제안합니다.',
    '먼저 옷의 종류, 주요 색(면적이 큰 순서로 1~3개, hex 포함), 무늬, 소재, 어울리는 스타일과 계절을 파악합니다. 배경은 색에 포함하지 않습니다.',
    '그다음 서로 다른 콘셉트의 룩 3개를 제안합니다: 뉴트럴 위주의 안전한 기본 룩, 같은 계열로 깊이를 주는 톤온톤(또는 모노톤) 룩, 색 하나로 포인트를 주는 룩.',
    '각 룩은 업로드한 옷을 제외한 나머지 칸(상의/하의/아우터/신발/가방·액세서리 중 해당하는 것)을 채우되, 여름이면 아우터는 빼고, 원피스면 상의와 하의는 넣지 않습니다.',
    '아이템 이름은 구체적으로(예: "와이드 슬랙스", "첼시 부츠"), 이유는 색·실루엣·소재 관점에서 한 문장으로 씁니다. 사람의 외모나 체형은 언급하지 않습니다.',
  ].join('\n');

  // image: { data: base64 문자열(줄바꿈 없음), mediaType: 'image/jpeg' }
  // hints: { category?, style?, season? } 사용자가 고른 값이 있으면 우선 반영
  async function analyze({ apiKey, image, hints }) {
    const sdk = await loadSdk();
    const Anthropic = sdk.default;
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 120000 });
    const hintLines = [];
    if (hints && hints.category) hintLines.push(`옷 종류는 "${hints.category}"로 봐 주세요.`);
    if (hints && hints.style) hintLines.push(`"${hints.style}" 스타일로 맞춰 주세요.`);
    if (hints && hints.season) hintLines.push(`계절은 "${hints.season}"입니다.`);
    const text = ['이 옷에 어울리는 코디를 추천해 주세요.'].concat(hintLines).join(' ');

    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          { type: 'text', text },
        ],
      }],
    });

    if (res.stop_reason === 'refusal') {
      throw new Error('AI가 이 사진의 분석을 거절했어요. 옷이 잘 보이는 다른 사진으로 다시 시도해 주세요.');
    }
    if (res.stop_reason === 'max_tokens') {
      throw new Error('AI 응답이 너무 길어 잘렸어요. 다시 시도해 주세요.');
    }
    const body = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) { throw new Error('AI 응답을 읽지 못했어요. 다시 시도해 주세요.'); }
    return normalize(parsed, res.model);
  }

  // 색 이름/hex 가 비어 있거나 이상하면 엔진으로 보정하고, 팔레트도 함께 만든다.
  function normalize(r, servedBy) {
    const fix = (hex, name) => {
      const ok = /^#?[0-9a-f]{6}$/i.test(String(hex || ''));
      const d = E.describeHex(ok ? hex : '#888888');
      return { hex: d.hex, name: (name && String(name).trim()) || d.name };
    };
    const item = r.item || {};
    const colors = (item.colors || []).slice(0, 3).map(c => fix(c.hex, c.name));
    if (!colors.length) colors.push(fix('#888888', ''));
    const looks = (r.looks || []).slice(0, 3).map(l => ({
      title: l.title || '룩', concept: l.concept || '', tip: l.tip || '',
      items: (l.items || []).map(it => { const c = fix(it.colorHex, it.colorName); return { slot: it.slot, name: it.name, colorHex: c.hex, colorName: c.name, reason: it.reason || '' }; }),
    }));
    return {
      source: 'ai', servedBy,
      item: {
        category: E.CATEGORIES.includes(item.category) ? item.category : '상의',
        style: E.STYLES.includes(item.style) ? item.style : '캐주얼',
        season: E.SEASONS.includes(item.season) ? item.season : E.currentSeason(),
        name: item.name || '', colors, pattern: item.pattern || '', material: item.material || '', summary: item.summary || '',
      },
      palette: E.harmony(colors[0].hex),
      looks,
    };
  }

  // SDK 오류를 사용자 문장으로. 구체적인 것부터 확인한다.
  async function describeError(err) {
    let sdk = null;
    try { sdk = await loadSdk(); } catch (e) { /* 번들을 못 불러온 경우 */ }
    if (sdk) {
      if (err instanceof sdk.AuthenticationError) return 'API 키가 올바르지 않아요. 설정에서 키를 다시 확인해 주세요.';
      if (err instanceof sdk.PermissionDeniedError) return '이 API 키로는 모델을 쓸 수 없어요. 콘솔에서 권한을 확인해 주세요.';
      if (err instanceof sdk.RateLimitError) return '요청이 잠시 많아요. 1분 뒤 다시 시도해 주세요.';
      if (err instanceof sdk.BadRequestError) return '요청이 거절됐어요: ' + shortMsg(err);
      if (err instanceof sdk.APIConnectionError) return '네트워크에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
      if (err instanceof sdk.APIError) return 'AI 서비스 오류가 났어요 (' + (err.status || '') + '). 잠시 뒤 다시 시도해 주세요.';
    }
    return err && err.message ? err.message : '알 수 없는 오류가 났어요.';
  }
  function shortMsg(err) {
    const m = (err && (err.error && err.error.error && err.error.error.message)) || (err && err.message) || '';
    return String(m).slice(0, 160);
  }

  window.AI = { analyze, describeError, loadSdk, MODEL, SCHEMA };
})();
