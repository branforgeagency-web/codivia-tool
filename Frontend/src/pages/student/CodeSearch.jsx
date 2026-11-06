/* CODIVIA platform — CODIVIA Code Search page */
import { useLocation, useNavigate } from 'react-router-dom';
import { FindACode } from '../../components/code-search/FindACode.jsx';
import { useStudent } from '../../context/StudentContext.jsx';

// route: /code-search
// When opened from a chart, location.state.returnTo holds that chart's path.
export default function CodeSearchPage() {
  const { codeDB, dbStatus } = useStudent();
  const navigate = useNavigate();
  const returnTo = useLocation().state?.returnTo;
  return (
    <>
      {returnTo && (
        <button className="backbtn" onClick={() => navigate(returnTo)}>
          ← Back to chart
        </button>
      )}
      <FindACode codeDB={codeDB} dbStatus={dbStatus} />
    </>
  );
}
