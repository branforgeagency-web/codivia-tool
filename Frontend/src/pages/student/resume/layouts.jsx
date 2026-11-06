// ---- small render helpers ----
export function _mono(a) {
  return (a || []).filter(function (x) {
    return x && ('' + x).trim();
  });
}

export function _monogram(name) {
  return (
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) {
        return w[0];
      })
      .join('')
      .toUpperCase() || 'CV'
  );
}

export function _photo(R, w, ratio, radius, borderColor) {
  ratio = ratio || 0.78;
  radius = radius == null ? 8 : radius;
  if (R.photo)
    return (
      <img
        src={R.photo}
        style={{
          width: w,
          height: w * ratio,
          borderRadius: radius,
          objectFit: 'cover',
          border: '2px solid ' + (borderColor || 'rgba(255,255,255,.6)'),
        }}
      />
    );
  return (
    <div
      style={{
        width: w,
        height: w * ratio,
        borderRadius: radius,
        background: 'rgba(255,255,255,.16)',
        border: '2px solid ' + (borderColor || 'rgba(255,255,255,.45)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: w * 0.32,
        fontWeight: 900,
        color: 'var(--color-white)',
      }}
    >
      {_monogram(R.name)}
    </div>
  );
}

export function _photoTint(R, w, P, round) {
  var rad = round ? '50%' : 10;
  if (R.photo)
    return (
      <img
        src={R.photo}
        style={{
          width: w,
          height: round ? w : w * 0.82,
          borderRadius: rad,
          objectFit: 'cover',
          border: '2px solid ' + P.accent + '55',
        }}
      />
    );
  return (
    <div
      style={{
        width: w,
        height: round ? w : w * 0.82,
        borderRadius: rad,
        background: P.tint,
        border: '2px solid ' + P.accent + '55',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: w * 0.32,
        fontWeight: 900,
        color: P.accent,
      }}
    >
      {_monogram(R.name)}
    </div>
  );
}

export function _contact(R, sep, color) {
  return [R.location, R.phone, R.email, R.linkedin]
    .filter(function (x) {
      return x && ('' + x).trim();
    })
    .join(sep || '  |  ');
}

// heading styles
export function _hUnderline(txt, P) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: P.deep,
        margin: '12px 0 7px',
        paddingBottom: 4,
        borderBottom: '2px solid ' + P.accent,
      }}
    >
      {txt}
    </div>
  );
}

export function _hPill(txt, P) {
  return (
    <div
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: 'var(--color-white)',
        background: P.accent,
        borderRadius: 20,
        padding: '3px 12px',
        margin: '12px 0 8px',
      }}
    >
      {txt}
    </div>
  );
}

export function _hBar(txt, P) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: P.deep,
        margin: '12px 0 7px',
        paddingLeft: 9,
        borderLeft: '4px solid ' + P.accent,
      }}
    >
      {txt}
    </div>
  );
}

export function _hPlain(txt, P) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 900,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: P.ink,
        margin: '13px 0 6px',
      }}
    >
      {txt}
    </div>
  );
}

// bullet list block
export function _bullets(items, P, sz) {
  return (
    <ul style={{ margin: '2px 0 8px', paddingLeft: 16 }}>
      {_mono(items).map(function (b, j) {
        return (
          <li
            key={j}
            style={{ fontSize: sz || 11.5, lineHeight: 1.5, color: 'var(--tone-334)', marginBottom: 3 }}
          >
            {b}
          </li>
        );
      })}
    </ul>
  );
}

// experience block (H is a heading fn)
export function _expBlock(R, P, H) {
  var out = [];
  var exp = _mono(R.experience);
  if (!exp.length) return out;
  out.push(H('Practical Medical Coding Experience', P));
  exp.forEach(function (x, i) {
    out.push(
      <div key={'x' + i} style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: P.ink }}>{x.role || ''}</div>
        {x.period ? (
          <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--tone-556)', marginBottom: 4 }}>
            {x.period}
          </div>
        ) : null}
        {_bullets(x.bullets, P)}
      </div>,
    );
  });
  return out;
}

export function _certEduProj(R, P, H) {
  var out = [];
  var certs = _mono(R.certifications);
  if (certs.length) {
    out.push(H('Certification', P));
    certs.forEach(function (x, i) {
      out.push(
        <div key={'c' + i} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: P.ink }}>{x.name || ''}</div>
          <div style={{ fontSize: 11, color: 'var(--tone-556)' }}>
            {[
              x.by,
              x.id ? 'Credential ID: ' + x.id : '',
              x.valid ? 'Valid Through: ' + x.valid : '',
            ]
              .filter(Boolean)
              .join(' | ')}
          </div>
        </div>,
      );
    });
  }
  var edu = _mono(R.education);
  if (edu.length) {
    out.push(H('Education', P));
    edu.forEach(function (x, i) {
      out.push(
        <div key={'e' + i} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: P.ink }}>{x.degree || ''}</div>
          <div style={{ fontSize: 11, color: 'var(--tone-556)' }}>
            {[x.school, x.period, x.detail].filter(Boolean).join(' | ')}
          </div>
        </div>,
      );
    });
  }
  var proj = _mono(R.projects);
  if (proj.length) {
    out.push(H('Academic Project / Internship', P));
    out.push(_bullets(proj, P));
  }
  return out;
}

// right-side skills sections, dark or light
export function _rcSection(title, items, P, onDark) {
  var list = _mono(items);
  if (!list.length) return null;
  var soft = onDark ? 'rgba(255,255,255,.72)' : P.deep;
  var txtc = onDark ? 'var(--color-white)' : 'var(--tone-334)';
  return (
    <div key={title} style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 900,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: soft,
          marginBottom: 6,
          paddingBottom: 3,
          borderBottom: '1.5px solid ' + (onDark ? 'rgba(255,255,255,.3)' : P.accent + '55'),
        }}
      >
        {title}
      </div>
      {list.map(function (s, i) {
        return (
          <div
            key={i}
            style={{
              fontSize: 11,
              color: txtc,
              lineHeight: 1.45,
              marginBottom: 3,
              paddingLeft: 10,
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                color: onDark ? 'var(--color-white)' : P.accent,
                fontWeight: 900,
              }}
            >
              ·
            </span>
            {s}
          </div>
        );
      })}
    </div>
  );
}

export function _skillChips(items, P) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
      {_mono(items).map(function (s) {
        return (
          <span
            key={s}
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              background: P.tint,
              color: P.deep,
              border: '1px solid ' + P.accent + '33',
              borderRadius: 5,
              padding: '3px 8px',
            }}
          >
            {s}
          </span>
        );
      })}
    </div>
  );
}

export function _statBoxes(R, P) {
  if (!_mono(R.stats3).length) return null;
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
      {R.stats3.map(function (s, i) {
        return (
          <div
            key={i}
            style={{
              flex: 1,
              background: P.tint,
              border: '1px solid ' + P.accent + '33',
              borderRadius: 8,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: P.deep }}>{s.big}</div>
            <div style={{ fontSize: 9.5, color: 'var(--tone-556)', marginTop: 2 }}>{s.small}</div>
          </div>
        );
      })}
    </div>
  );
}

export function _rightStack(R, P, onDark) {
  return [
    _rcSection('Core Coding Skills', R.coreSkills, P, onDark),
    _rcSection('Clinical Knowledge', R.clinical, P, onDark),
    _rcSection('Tools', R.tools, P, onDark),
    _rcSection('Professional Strengths', R.strengths, P, onDark),
    _rcSection('Languages', R.languages, P, onDark),
  ];
}

// ============ LAYOUT ENGINES ============
export function L_headerBand(R, P) {
  return (
    <div
      style={{
        background: 'var(--color-white)',
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '22px 26px',
          background: P.accent,
          color: 'var(--color-white)',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.05 }}>
            {(R.name || '').toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: 1,
              marginTop: 4,
              opacity: 0.95,
            }}
          >
            {R.role || ''}
          </div>
          <div style={{ fontSize: 11, marginTop: 7, opacity: 0.92 }}>{_contact(R)}</div>
        </div>
        {_photo(R, 90)}
      </div>
      {R.summary ? (
        <div style={{ padding: '16px 26px 0' }}>
          {_hUnderline('Professional Summary', P)}
          <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--tone-334)' }}>{R.summary}</div>
        </div>
      ) : null}
      <div style={{ padding: '12px 26px 0' }}>{_statBoxes(R, P)}</div>
      <div style={{ display: 'flex', gap: 20, padding: '14px 26px 26px' }}>
        <div style={{ flex: '1 1 60%' }}>
          {_expBlock(R, P, _hUnderline)}
          {_certEduProj(R, P, _hUnderline)}
        </div>
        <div
          style={{
            flex: '1 1 40%',
            background: 'var(--tone-fafbfc)',
            borderRadius: 10,
            padding: '14px 16px',
            alignSelf: 'flex-start',
          }}
        >
          {_rightStack(R, P, false)}
        </div>
      </div>
    </div>
  );
}

export function L_rail(R, P, side) {
  var rail = (
    <div style={{ width: '35%', background: P.deep, color: 'var(--color-white)', padding: '24px 18px' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>{_photo(R, 86, 0.86, '50%')}</div>
      <div style={{ fontSize: 19, fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
        {R.name}
      </div>
      <div
        style={{
          fontSize: 10.5,
          opacity: 0.9,
          textAlign: 'center',
          letterSpacing: 0.5,
          marginTop: 3,
          marginBottom: 8,
        }}
      >
        {R.role}
      </div>
      <div
        style={{
          height: 3,
          width: 34,
          background: P.accent,
          margin: '0 auto 14px',
          borderRadius: 2,
        }}
      />
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          opacity: 0.7,
          marginBottom: 5,
        }}
      >
        Contact
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.7, marginBottom: 12 }}>
        {[R.phone, R.email, R.location, R.linkedin]
          .filter(function (x) {
            return x && ('' + x).trim();
          })
          .map(function (x, i) {
            return <div key={i}>{x}</div>;
          })}
      </div>
      {_rightStack(R, P, true)}
    </div>
  );
  var body = (
    <div style={{ flex: 1, padding: '22px 24px' }}>
      {R.summary
        ? [
            _hUnderline('Professional Summary', P),
            <div
              key="s"
              style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--tone-334)', marginBottom: 10 }}
            >
              {R.summary}
            </div>,
          ]
        : null}
      {_statBoxes(R, P)}
      <div style={{ height: 8 }} />
      {_expBlock(R, P, _hUnderline)}
      {_certEduProj(R, P, _hUnderline)}
    </div>
  );
  var kids = side === 'right' ? [body, rail] : [rail, body];
  return (
    <div
      style={{
        background: 'var(--color-white)',
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        minHeight: 440,
      }}
    >
      {kids}
    </div>
  );
}

export function L_topBanner(R, P) {
  return (
    <div
      style={{
        background: 'var(--color-white)',
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg,' + P.accent + ',' + P.deep + ')',
          color: 'var(--color-white)',
          padding: '26px 20px 22px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          {_photo(R, 84, 1, '50%')}
        </div>
        <div style={{ fontSize: 25, fontWeight: 900, letterSpacing: 0.5 }}>
          {(R.name || '').toUpperCase()}
        </div>
        <div
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, marginTop: 4, opacity: 0.95 }}
        >
          {R.role}
        </div>
        <div style={{ fontSize: 11, marginTop: 8, opacity: 0.9 }}>{_contact(R)}</div>
      </div>
      <div style={{ padding: '18px 30px 26px' }}>
        {R.summary
          ? [
              _hPill('Professional Summary', P),
              <div
                key="s"
                style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--tone-334)', marginBottom: 10 }}
              >
                {R.summary}
              </div>,
            ]
          : null}
        {_statBoxes(R, P)}
        <div style={{ height: 10 }} />
        {_expBlock(R, P, _hPill)}
        {_certEduProj(R, P, _hPill)}
        {_hPill('Core Coding Skills', P)}
        {_skillChips(R.coreSkills, P)}
        {_hPill('Clinical Knowledge', P)}
        {_skillChips(R.clinical, P)}
        <div style={{ display: 'flex', gap: 18 }}>
          <div style={{ flex: 1 }}>
            {_hPill('Tools', P)}
            {_skillChips(R.tools, P)}
          </div>
          <div style={{ flex: 1 }}>
            {_hPill('Languages', P)}
            {_skillChips(R.languages, P)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function L_minimal(R, P) {
  return (
    <div
      style={{
        background: 'var(--color-white)',
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        padding: '26px 30px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          borderBottom: '2px solid ' + P.accent,
          paddingBottom: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1, color: P.ink }}>
          {(R.name || '').toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: P.accent,
            marginTop: 3,
          }}
        >
          {R.role}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tone-556)', marginTop: 6 }}>{_contact(R, '  •  ')}</div>
      </div>
      {R.summary
        ? [
            _hPlain('Professional Summary', P),
            <div key="s" style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--tone-334)', marginBottom: 6 }}>
              {R.summary}
            </div>,
          ]
        : null}
      {_expBlock(R, P, _hPlain)}
      {_certEduProj(R, P, _hPlain)}
      {_hPlain('Core Coding Skills', P)}
      <div style={{ fontSize: 11.5, color: 'var(--tone-334)', lineHeight: 1.6, marginBottom: 6 }}>
        {_mono(R.coreSkills).join('  ·  ')}
      </div>
      {_hPlain('Clinical Knowledge', P)}
      <div style={{ fontSize: 11.5, color: 'var(--tone-334)', lineHeight: 1.6, marginBottom: 6 }}>
        {_mono(R.clinical).join('  ·  ')}
      </div>
      {_hPlain('Tools', P)}
      <div style={{ fontSize: 11.5, color: 'var(--tone-334)', lineHeight: 1.6, marginBottom: 6 }}>
        {_mono(R.tools).join('  ·  ')}
      </div>
      {_hPlain('Strengths & Languages', P)}
      <div style={{ fontSize: 11.5, color: 'var(--tone-334)', lineHeight: 1.6 }}>
        {_mono(R.strengths).concat(_mono(R.languages)).join('  ·  ')}
      </div>
    </div>
  );
}

export function L_timeline(R, P) {
  var exp = _mono(R.experience);
  var expNode = exp.length ? (
    <div>
      {_hBar('Practical Medical Coding Experience', P)}
      <div style={{ position: 'relative', paddingLeft: 20, marginLeft: 4 }}>
        <div
          style={{
            position: 'absolute',
            left: 4,
            top: 4,
            bottom: 4,
            width: 2,
            background: P.accent + '55',
          }}
        />
        {exp.map(function (x, i) {
          return (
            <div key={i} style={{ position: 'relative', marginBottom: 12 }}>
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: 3,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: P.accent,
                  border: '2px solid var(--color-white)',
                  boxShadow: '0 0 0 2px ' + P.accent + '55',
                }}
              />
              <div style={{ fontSize: 12.5, fontWeight: 800, color: P.ink }}>{x.role || ''}</div>
              {x.period ? (
                <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--tone-556)', marginBottom: 4 }}>
                  {x.period}
                </div>
              ) : null}
              {_bullets(x.bullets, P)}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;
  return (
    <div
      style={{
        background: 'var(--color-white)',
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '20px 26px',
          borderBottom: '3px solid ' + P.accent,
        }}
      >
        {_photoTint(R, 72, P, true)}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 25, fontWeight: 900, color: P.ink, letterSpacing: 0.5 }}>
            {(R.name || '').toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              color: P.accent,
              marginTop: 3,
            }}
          >
            {R.role}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tone-556)', marginTop: 6 }}>{_contact(R)}</div>
        </div>
      </div>
      <div style={{ padding: '16px 26px 0' }}>{_statBoxes(R, P)}</div>
      <div style={{ display: 'flex', gap: 20, padding: '12px 26px 26px' }}>
        <div style={{ flex: '1 1 60%' }}>
          {R.summary
            ? [
                _hBar('Professional Summary', P),
                <div
                  key="s"
                  style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--tone-334)', marginBottom: 8 }}
                >
                  {R.summary}
                </div>,
              ]
            : null}
          {expNode}
          {_certEduProj(R, P, _hBar)}
        </div>
        <div style={{ flex: '1 1 40%' }}>{_rightStack(R, P, false)}</div>
      </div>
    </div>
  );
}

export function L_compact(R, P) {
  function card(title, kids) {
    return (
      <div
        style={{
          border: '1px solid ' + P.accent + '22',
          borderRadius: 9,
          padding: '10px 12px',
          marginBottom: 10,
          background: 'var(--color-white)',
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 900,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: P.accent,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        {kids}
      </div>
    );
  }
  return (
    <div
      style={{
        background: P.tint,
        border: '0.5px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'var(--color-white)',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 12,
          borderLeft: '5px solid ' + P.accent,
        }}
      >
        {_photoTint(R, 64, P, false)}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: P.ink }}>
            {(R.name || '').toUpperCase()}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, color: P.accent }}>
            {R.role}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--tone-556)', marginTop: 4 }}>{_contact(R, '  ·  ')}</div>
        </div>
      </div>
      {R.summary
        ? card(
            'Professional Summary',
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--tone-334)' }}>{R.summary}</div>,
          )
        : null}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: '1 1 58%' }}>
          {card(
            'Experience',
            <div>
              {_mono(R.experience).map(function (x, i) {
                return (
                  <div key={i}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: P.ink }}>
                      {x.role || ''}
                    </div>
                    {x.period ? (
                      <div
                        style={{
                          fontSize: 10.5,
                          fontStyle: 'italic',
                          color: 'var(--tone-556)',
                          marginBottom: 3,
                        }}
                      >
                        {x.period}
                      </div>
                    ) : null}
                    {_bullets(x.bullets, P, 11)}
                  </div>
                );
              })}
            </div>,
          )}
          {card(
            'Certification & Education',
            <div>
              {_certEduProj(R, P, function (t, PP) {
                return (
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: PP.accent,
                      margin: '6px 0 4px',
                    }}
                  >
                    {t}
                  </div>
                );
              })}
            </div>,
          )}
        </div>
        <div style={{ flex: '1 1 42%' }}>
          {card('Core Skills', _skillChips(R.coreSkills, P))}
          {card('Clinical Knowledge', _skillChips(R.clinical, P))}
          {card('Tools & Languages', _skillChips(_mono(R.tools).concat(_mono(R.languages)), P))}
        </div>
      </div>
    </div>
  );
}

// dispatcher
export function renderResume(layoutKey, R, P) {
  switch (layoutKey) {
    case 'left-rail':
      return L_rail(R, P, 'left');
    case 'right-rail':
      return L_rail(R, P, 'right');
    case 'top-banner':
      return L_topBanner(R, P);
    case 'minimal':
      return L_minimal(R, P);
    case 'timeline':
      return L_timeline(R, P);
    case 'compact':
      return L_compact(R, P);
    default:
      return L_headerBand(R, P);
  }
}
