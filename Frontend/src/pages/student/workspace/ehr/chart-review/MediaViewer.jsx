/* Media viewer (Chart Review › Media preview): the scan / photo attached to a Media item.
   Images: zoom in / out, fit, rotate. PDFs: the browser's PDF viewer. Both: open in a new tab. */
import { useState } from 'react';
import { isImage } from './chartReviewData.js';

export function MediaViewer({ file, title }) {
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  const image = isImage(file);
  const step = (d) => setZoom((z) => Math.min(4, Math.max(0.25, Math.round((z + d) * 100) / 100)));
  return (
    <div className="ehr-media">
      <div className="ehr-media-tb">
        <b>{title || file.name}</b>
        <div className="sp" />
        {image && (
          <>
            <button type="button" className="ehr-x" onClick={() => step(-0.25)} title="Zoom out">
              <i className="bi bi-zoom-out" />
            </button>
            <span className="pct">{Math.round(zoom * 100)}%</span>
            <button type="button" className="ehr-x" onClick={() => step(0.25)} title="Zoom in">
              <i className="bi bi-zoom-in" />
            </button>
            <button
              type="button"
              className="ehr-x"
              onClick={() => (setZoom(1), setTurn(0))}
              title="Fit"
            >
              <i className="bi bi-arrows-angle-contract" />
            </button>
            <button
              type="button"
              className="ehr-x"
              onClick={() => setTurn((t) => (t + 90) % 360)}
              title="Rotate"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
          </>
        )}
        <a
          className="ehr-x"
          href={file.url}
          target="_blank"
          rel="noreferrer"
          title="Open in a new tab"
        >
          <i className="bi bi-box-arrow-up-right" />
        </a>
      </div>
      <div className="ehr-media-view">
        {image ? (
          <img
            src={file.url}
            alt={title || file.name || 'Media'}
            style={{ width: zoom * 100 + '%', transform: turn ? `rotate(${turn}deg)` : undefined }}
          />
        ) : (
          <iframe src={file.url} title={title || file.name || 'Media'} />
        )}
      </div>
    </div>
  );
}
