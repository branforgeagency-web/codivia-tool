/* PatientIQ: patient-reported information documented in the record (history, ROS, complaints). */
import { sectionsMatching, visitSections } from '../lib/chartText.js';
import { ActivityHeader, Card, Note, ReportView } from '../ui/index.js';

const PATIENT_REPORTED =
  /REVIEW OF SYSTEMS|\bROS\b|SOCIAL|FAMILY|CHIEF COMPLAINT|HISTORY OF PRESENT|PATIENT.REPORTED|QUESTIONNAIRE|PAIN/i;

export function PatientIQ({ docs, find }) {
  const secs = sectionsMatching(visitSections(docs), PATIENT_REPORTED);
  return (
    <div className="ehr-act">
      <ActivityHeader
        title="PatientIQ"
        sub="Patient-reported information documented for this visit"
      />
      <Card title="Questionnaires" icon="bi-ui-checks">
        <Note>No questionnaires were filed for this encounter.</Note>
      </Card>
      <Card title="Patient-reported history" icon="bi-chat-square-quote">
        {secs.length ? (
          <ReportView sections={secs} find={find} />
        ) : (
          <Note>Nothing patient-reported in this chart.</Note>
        )}
      </Card>
    </div>
  );
}
