import { lazy, Suspense } from 'react';
import type React from 'react';
import { Navigate, Route, Routes, matchPath, useLocation, type Location } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { NoteInputProvider } from './input/NoteInputProvider';
import { MetronomeProvider } from './metronome/MetronomeProvider';
import PracticeClock from './progress/PracticeClock';
import AppLayout from './components/AppLayout';
import ImmersiveFrame, { useCloseImmersive, type ImmersiveState } from './components/ImmersiveFrame';
import TodayPage from './pages/TodayPage';
import PracticeHubPage from './pages/PracticeHubPage';
import PracticeSessionPage from './pages/PracticeSessionPage';
import RepertoirePage from './pages/RepertoirePage';
import CategoryPage from './pages/CategoryPage';
import MusiciansPage from './pages/MusiciansPage';
import PieceFormPage from './pages/PieceFormPage';
import PiecePage from './pages/PiecePage';
import StudyPage from './pages/StudyPage';
import ModulePage from './pages/ModulePage';
import LessonPage from './pages/LessonPage';
import ProgressPage from './pages/ProgressPage';
import AccountPage from './pages/AccountPage';
import TrainingSessionPage from './pages/TrainingSessionPage';
import { CalibratePage, ExamPage, ReadingPage, WarmupPage } from './pages/TrainingExtrasPages';

// O leitor de PDF é pesado: só carrega quando você abre uma partitura.
const SheetViewerPage = lazy(() => import('./pages/SheetViewerPage'));
// A partitura interativa (OpenSheetMusicDisplay) também só carrega quando você estuda uma peça.
const ScorePracticePage = lazy(() => import('./pages/ScorePracticePage'));

function ScorePopup() {
  const close = useCloseImmersive('/repertorio');
  return (
    <ImmersiveFrame onClose={close} label="Tocar a música">
      <Suspense fallback={<div className="session" />}>
        <ScorePracticePage onClose={close} />
      </Suspense>
    </ImmersiveFrame>
  );
}

function SessionPopup() {
  const close = useCloseImmersive('/treino');
  return (
    <ImmersiveFrame onClose={close} label="Treino">
      <PracticeSessionPage onClose={close} />
    </ImmersiveFrame>
  );
}

function SheetPopup() {
  const close = useCloseImmersive('/repertorio');
  return (
    <ImmersiveFrame onClose={close} label="Partitura">
      <Suspense fallback={<div className="viewer" />}>
        <SheetViewerPage onClose={close} />
      </Suspense>
    </ImmersiveFrame>
  );
}

function TreinoPopup({ label, render }: { label: string; render: (close: () => void) => React.ReactNode }) {
  const close = useCloseImmersive('/treino');
  return (
    <ImmersiveFrame onClose={close} label={label}>
      {render(close)}
    </ImmersiveFrame>
  );
}

const IMMERSIVE = ['/treino/sessao', '/partitura/:id', '/treino/t/:id', '/treino/aquecimento', '/treino/leitura', '/treino/prova/:n', '/treino/calibrar', '/peca/:id/estudar'];

export default function App() {
  const location = useLocation();
  const immersive = IMMERSIVE.some((p) => matchPath(p, location.pathname));
  // O popup abre por cima da página de onde você veio. Aberto direto pelo link, mostra Treino ou Repertório atrás.
  const background: Location = (location.state as ImmersiveState | null)?.background ??
    (immersive ? { ...location, pathname: location.pathname.startsWith('/partitura') || location.pathname.startsWith('/peca') ? '/repertorio' : '/treino', search: '', state: null } : location);

  return (
    <ThemeProvider>
      <NoteInputProvider>
        <MetronomeProvider>
          <PracticeClock />
        <Routes location={background}>
          <Route element={<AppLayout />}>
            <Route index element={<TodayPage />} />
            <Route path="/treino" element={<PracticeHubPage />} />
            <Route path="/repertorio" element={<RepertoirePage />} />
            <Route path="/repertorio/nova" element={<PieceFormPage />} />
            <Route path="/repertorio/categoria/:slug" element={<CategoryPage />} />
            <Route path="/repertorio/musicos" element={<MusiciansPage />} />
            <Route path="/repertorio/peca/:id" element={<PiecePage />} />
            <Route path="/repertorio/peca/:id/editar" element={<PieceFormPage />} />
            <Route path="/conta" element={<AccountPage />} />
            <Route path="/estudo" element={<StudyPage />} />
            <Route path="/estudo/:moduleId" element={<ModulePage />} />
            <Route path="/estudo/:moduleId/:lessonId" element={<LessonPage />} />
            <Route path="/progresso" element={<ProgressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>

        {/* Modo imersivo: popup por cima da página */}
        {immersive && (
          <Routes>
            <Route path="/treino/sessao" element={<SessionPopup />} />
            <Route path="/treino/t/:id" element={<TreinoPopup label="Treino" render={(c) => <TrainingSessionPage onClose={c} />} />} />
            <Route path="/treino/aquecimento" element={<TreinoPopup label="Aquecimento" render={(c) => <WarmupPage onClose={c} />} />} />
            <Route path="/treino/leitura" element={<TreinoPopup label="Leitura à primeira vista" render={(c) => <ReadingPage onClose={c} />} />} />
            <Route path="/treino/prova/:n" element={<TreinoPopup label="Prova" render={(c) => <ExamPage onClose={c} />} />} />
            <Route path="/treino/calibrar" element={<TreinoPopup label="Ajustar atraso" render={(c) => <CalibratePage onClose={c} />} />} />
            <Route path="/partitura/:id" element={<SheetPopup />} />
            <Route path="/peca/:id/estudar" element={<ScorePopup />} />
          </Routes>
        )}
        </MetronomeProvider>
      </NoteInputProvider>
    </ThemeProvider>
  );
}
