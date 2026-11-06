/* CODIVIA platform — Firebase init + window.CV_FB data API */
// ---- Firebase init (modular browser SDK) ----
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAbQN4mTOgF-l67E4jeNkCXYpPVmnoSXEk',
  authDomain: 'codivia-platform.firebaseapp.com',
  projectId: 'codivia-platform',
  storageBucket: 'codivia-platform.firebasestorage.app',
  messagingSenderId: '129973090855',
  appId: '1:129973090855:web:c1ce2a785df54fb9562c02',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Issue the next sequential Student ID atomically via a counter doc.
async function nextStudentId() {
  const cref = doc(db, 'counters', 'students');
  const n = await runTransaction(db, async (tx) => {
    const snap = await tx.get(cref);
    const cur = snap.exists() ? snap.data().count || 0 : 0;
    const next = cur + 1;
    tx.set(cref, { count: next }, { merge: true });
    return next;
  });
  return 'STU-' + String(n).padStart(5, '0');
}

// Expose a small, stable API for the (non-module) app code.
window.CV_FB = {
  ready: true,
  auth,
  db,
  storage,
  onAuth: (cb) => onAuthStateChanged(auth, cb),
  register: async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const studentId = await nextStudentId();
    await setDoc(doc(db, 'students', uid), {
      studentId,
      name: name || '',
      email,
      depts: {},
      createdAt: serverTimestamp(),
    });
    return { uid, studentId };
  },
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),
  logout: () => signOut(auth),
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
  getStudent: async (uid) => {
    const s = await getDoc(doc(db, 'students', uid));
    return s.exists() ? s.data() : null;
  },
  getRole: async (uid) => {
    try {
      const r = await getDoc(doc(db, 'roles', uid));
      return r.exists() ? r.data().role || null : null;
    } catch (e) {
      return null;
    }
  },
  getAllocation: async (uid) => {
    try {
      const a = await getDoc(doc(db, 'allocations', uid));
      return a.exists() ? a.data().depts || {} : {};
    } catch (e) {
      return {};
    }
  },
  setAllocation: async (uid, depts) => {
    // The caller (allocate / allocateMany) always builds the COMPLETE intended
    // depts map, having already dropped any removed departments. We must OVERWRITE
    // the depts field wholesale — merge:true would only add/overwrite keys and
    // could never delete a removed department, so removals never propagated to
    // the student. Overwrite the field; keep updatedAt via a full set.
    await setDoc(doc(db, 'allocations', uid), { depts: depts || {}, updatedAt: serverTimestamp() });
  },
  listStudents: async () => {
    const snap = await getDocs(collection(db, 'students'));
    // Read every student's allocation + progress IN PARALLEL. The previous
    // implementation awaited each student's two docs sequentially, so 1000+
    // students meant 2000+ serial round-trips (minutes). Promise.all collapses
    // that to a handful of seconds. Each student's reads still fail-soft.
    const out = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data() || {};
        let depts = {};
        try {
          const a = await getDoc(doc(db, 'allocations', d.id));
          if (a.exists()) depts = a.data().depts || {};
        } catch (e) {}
        let results = {},
          progressError = null;
        try {
          const pr = await getDoc(doc(db, 'students', d.id, 'progress', 'main'));
          if (pr.exists()) results = pr.data().results || {};
        } catch (e) {
          progressError = (e && e.code) || 'error';
        }
        return {
          uid: d.id,
          id: data.studentId || d.id,
          name: data.name || data.email || d.id,
          email: data.email || '',
          depts,
          results,
          progressError,
        };
      }),
    );
    return out;
  },
  saveProgress: async (uid, results) => {
    await setDoc(
      doc(db, 'students', uid, 'progress', 'main'),
      { results, updatedAt: serverTimestamp() },
      { merge: true },
    );
  },
  loadProgress: async (uid) => {
    const p = await getDoc(doc(db, 'students', uid, 'progress', 'main'));
    return p.exists() ? p.data().results || {} : {};
  },
  // Certificate uploads
  uploadCert: async (uid, file) => {
    const path = `certificates/${uid}/${Date.now()}_${file.name}`;
    const r = storageRef(storage, path);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    return { path, url, name: file.name };
  },
  listCerts: async (uid) => {
    const r = storageRef(storage, `certificates/${uid}`);
    const res = await listAll(r);
    const out = [];
    for (const item of res.items) {
      const url = await getDownloadURL(item);
      out.push({ path: item.fullPath, url, name: item.name.replace(/^\d+_/, '') });
    }
    return out;
  },
  deleteCert: async (path) => {
    await deleteObject(storageRef(storage, path));
  },

  // ---------- Uploaded charts ----------
  // Flow: admin uploads a de-identified record -> stored as a DRAFT in
  // uploadedCharts with status:'draft' -> admin reviews/edits the AI-suggested
  // answer key -> status:'published' makes it visible to students.
  // Drafts are never shown to students.
  uploadChartFile: async (file) => {
    const path = `chart-uploads/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
    const r = storageRef(storage, path);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    return { path, url, name: file.name };
  },
  saveUploadedChart: async (id, data) => {
    await setDoc(
      doc(db, 'uploadedCharts', id),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true },
    );
  },
  listUploadedCharts: async () => {
    const snap = await getDocs(collection(db, 'uploadedCharts'));
    const out = [];
    snap.forEach((d) => {
      out.push({ ...d.data(), id: d.id });
    });
    return out;
  },
  deleteUploadedChart: async (id, filePath) => {
    await deleteDoc(doc(db, 'uploadedCharts', id));
    if (filePath) {
      try {
        await deleteObject(storageRef(storage, filePath));
      } catch (e) {}
    }
  },
};
// Let the app know Firebase is ready (in case it loaded first).
window.dispatchEvent(new Event('cv-fb-ready'));
