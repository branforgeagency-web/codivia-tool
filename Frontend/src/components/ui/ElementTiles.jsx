/* CODIVIA platform — code-set tiles (ICD-10-CM, CPT, …) shown on department cards */
import { ELEMENT_LABELS } from '../../config/constants.js';

// Reusable element-tiles renderer
export function ElementTiles(props) {
  var els = (props.dept && props.dept.elements) || [];
  return (
    <div className={'el-tiles' + (props.setting ? ' setting' : '')}>
      {els.map(function (x) {
        return (
          <span key={x} className="el-tile">
            {ELEMENT_LABELS[x] || x}
          </span>
        );
      })}
    </div>
  );
}
