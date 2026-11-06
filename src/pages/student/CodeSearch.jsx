/* CODIVIA platform — CODIVIA Code Search page */
import { FindACode } from '../../components/code-search/FindACode.jsx';
import { useStudent } from '../../context/StudentContext.jsx';

// route: /code-search
export default function CodeSearchPage() {
  const { codeDB, dbStatus } = useStudent();
  return <FindACode codeDB={codeDB} dbStatus={dbStatus} />;
}
