const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  charts: 'M8 4H5v17h14V4h-3 M9 2h6v5H9z M8 12h8 M8 16h5',
  progress: 'M4 20V10 M10 20V4 M16 20v-8 M22 20H2',
  findcode: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  guide: 'M12 5v16 M12 5C9 2 5 2 2 3v16c4-1 7-1 10 2 3-3 6-3 10-2V3c-3-1-7-1-10 2',
  drugref: 'M9 15l6-6 M4 20a5 5 0 0 1 0-7l9-9a5 5 0 0 1 7 7l-9 9a5 5 0 0 1-7 0',
  certificate: 'M8 14l-2 8 6-3 6 3-2-8 M19 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  mycerts: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h3',
  resume: 'M14 2H4v20h16V8z M14 2v6h6 M8 12h8 M8 16h6',
  departments: 'M3 7h18v14H3z M3 7V3h7l3 4',
  students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',
  upload: 'M12 16V3 M7 8l5-5 5 5 M3 15v6h18v-6',
  locked: 'M5 10h14v12H5z M8 10V6a4 4 0 0 1 8 0v4',
};

export function NavIcon({ name }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.charts} /></svg>;
}
