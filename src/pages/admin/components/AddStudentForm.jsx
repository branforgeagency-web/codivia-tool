export function AddStudentForm({ students, addStudent, onClose }) {
  return (
    <div>
      <div style={{ padding: '20px 22px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
          Students register themselves
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
          You no longer add students manually.
        </p>
      </div>
      <div style={{ padding: '16px 22px', fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6 }}>
        {
          'Each student creates their own account from the sign-in screen using their email and a password. '
        }
        {'They automatically receive a unique Student ID (STU-00001, STU-00002…). '}
        <br />
        <br />
        {'Once they have registered, tap '}
        <b>Refresh</b>
        {' and they will appear in the Students list. '}
        {'You can then use '}
        <b>Manage Access</b>
        {' to allocate department charts to them.'}
      </div>
      <div className="result-actions">
        <button
          style={{ background: 'var(--teal)', color: 'var(--color-white)' }}
          onClick={() => {
            addStudent();
          }}
        >
          {'Refresh & Close'}
        </button>
      </div>
    </div>
  );
}
