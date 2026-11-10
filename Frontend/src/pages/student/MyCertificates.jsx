import { useEffect, useState } from 'react';
import React from 'react';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { useStudent } from '../../context/StudentContext.jsx';

// ---- Student certificate uploads (AAPC + educational certs) ----
export function MyCertificates({ stu }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = React.useRef(null);

  const refresh = React.useCallback(() => {
    if (!stu.uid || !window.CV_FB) {
      setItems([]);
      return;
    }
    window.CV_FB.listCerts(stu.uid)
      .then(setItems)
      .catch((e) => {
        console.error(e);
        setItems([]);
      });
  }, [stu.uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onPick = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    setErr('');
    const okType = /^image\//.test(file.type) || file.type === 'application/pdf';
    if (!okType) {
      setErr('Please upload an image (JPG/PNG) or a PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr('File is too large. Maximum size is 10 MB.');
      return;
    }
    setBusy(true);
    try {
      await window.CV_FB.uploadCert(stu.uid, file);
      refresh();
    } catch (e) {
      console.error(e);
      setErr('Upload failed. Please try again.');
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = async (path) => {
    setBusy(true);
    try {
      await window.CV_FB.deleteCert(path);
      refresh();
    } catch (e) {
      console.error(e);
      setErr('Could not delete that file.');
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="page-head">
        <h1>My Certificates</h1>
        <p>
          Upload your AAPC certification and any educational certificates. Only you can see these.
        </p>
      </div>
      <div className="card">
        <div
          style={{
            padding: '22px',
            textAlign: 'center',
            border: '2px dashed var(--line)',
            borderRadius: 12,
            margin: '6px',
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 8 }}>📎</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Upload a certificate</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            JPG, PNG or PDF · up to 10 MB
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={onPick}
          />
          <button
            className="btn btn-teal"
            disabled={busy}
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            {busy ? 'Uploading…' : '+ Choose file'}
          </button>
          {err && <div style={{ color: 'var(--tone-d33)', fontSize: 12, marginTop: 10 }}>{err}</div>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <h3>Uploaded certificates</h3>
        </div>
        {items === null ? (
          <PageLoader variant="inline" label="Loading certificates" />
        ) : items.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>
            No certificates uploaded yet.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {['File', '', ''].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{it.name}</span>
                  </td>
                  <td>
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--teal-d)', fontWeight: 700, fontSize: 12 }}
                    >
                      View
                    </a>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => remove(it.path)}
                      style={{ fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// route: /my-certificates
export default function MyCertificatesPage() {
  const { stu } = useStudent();
  return <MyCertificates stu={stu} />;
}
