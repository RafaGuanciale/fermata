import type { Feedback } from '../drill/drill';
import { noteInfo, noteLabel } from '../music/notes';
import { formatSeconds } from '../format';
import { CheckIcon, CrossIcon, NoteIcon } from './Icons';

export default function DrillFeedback({ feedback }: { feedback: Feedback }) {
  if (feedback.kind === 'hit') {
    return (
      <div className="drillFeedback drillFeedback-hit" role="status">
        <span className="drillFeedback__icon"><CheckIcon className="drillFeedback__glyph" /></span>
        <span className="drillFeedback__text">Acertou: {noteLabel(feedback.played)}</span>
        <span className="drillFeedback__detail">{formatSeconds(feedback.ms)}</span>
      </div>
    );
  }
  if (feedback.kind === 'miss') {
    const played = noteInfo(feedback.played);
    const expected = noteInfo(feedback.expected);
    return (
      <div className="drillFeedback drillFeedback-miss" role="status">
        <span className="drillFeedback__icon"><CrossIcon className="drillFeedback__glyph" /></span>
        <span className="drillFeedback__text">
          Tocou {played.name}, era {expected.name}
        </span>
        <span className="drillFeedback__detail">
          {played.sci} → {expected.sci}
        </span>
      </div>
    );
  }
  if (feedback.kind === 'ready') {
    return (
      <div className="drillFeedback drillFeedback-neutral" role="status">
        <span className="drillFeedback__icon"><NoteIcon className="drillFeedback__glyph" /></span>
        <span className="drillFeedback__text">Toque a nota marcada com o anel</span>
      </div>
    );
  }
  return null;
}
