import { lazy, Suspense, useMemo } from 'react';
import type React from 'react';
import { Navigate, Route, Routes, matchPath, useLocation, useParams, type Location } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { NoteInputProvider } from './input/NoteInputProvider';
import { MetronomeProvider } from './metronome/MetronomeProvider';
import { LiveSoundProvider } from './audio/LiveSound';
import PracticeClock from './progress/PracticeClock';
import AppLayout from './components/AppLayout';
import ImmersiveFrame, { useCloseImmersive, type ImmersiveState } from './components/ImmersiveFrame';
import TodayPage from './pages/TodayPage';
import PracticeSessionPage from './pages/PracticeSessionPage';
import RepertoirePage from './pages/RepertoirePage';
import CategoryPage from './pages/CategoryPage';
import MusiciansPage from './pages/MusiciansPage';
import PieceFormPage from './pages/PieceFormPage';
import PiecePage from './pages/PiecePage';
import StudyPage from './pages/StudyPage';
import { findSong } from './course';
import { findArcadeSong } from './arcade/songs';
import { songTune } from './arcade/arcade';
import AccountPage from './pages/AccountPage';
import CalibratePage from './pages/CalibratePage';
import LoginPage from './pages/LoginPage';
import { useAccount } from './sync/account';

// O leitor de PDF é pesado: só carrega quando você abre uma partitura.
const SheetViewerPage = lazy(() => import('./pages/SheetViewerPage'));
const PracticeHubPage = lazy(() => import('./pages/PracticeHubPage'));
const CourseLessonPage = lazy(() => import('./pages/CourseLessonPage'));
const CourseUnitPage = lazy(() => import('./pages/CourseUnitPage'));
const CourseFocusPage = lazy(() => import('./pages/CourseFocusPage'));
const ReferencePage = lazy(() => import('./pages/ReferencePage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const NoteReadingPage = lazy(() => import('./pages/NoteReadingPage'));
const TreinoFocusPage = lazy(() => import('./pages/TreinoFocusPage'));
const ArcadePage = lazy(() => import('./pages/ArcadePage'));
const ArcadeGame = lazy(() => import('./arcade/ArcadeGame'));
const MidiArcade = lazy(() => import('./arcade/MidiArcade'));
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

function CourseSongPopup() {
  const close = useCloseImmersive('/estudo');
  const song = findSong(useParams().songId ?? '');
  if (!song) return <Navigate to="/estudo" replace />;
  return (
    <ImmersiveFrame onClose={close} label="Tocar a música">
      <Suspense fallback={<div className="session" />}>
        <ScorePracticePage onClose={close} song={song} />
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

function ArcadePopup() {
  const close = useCloseImmersive('/arcade');
  const song = findArcadeSong(useParams().id ?? '');
  const tune = useMemo(() => (song ? songTune(song) : null), [song]);
  if (!song || !tune) return <Navigate to="/arcade" replace />;
  return (
    <ImmersiveFrame onClose={close} label={`Arcade: ${song.title}`}>
      <Suspense fallback={<div className="arcade" />}>
        <ArcadeGame tune={tune} onClose={close} />
      </Suspense>
    </ImmersiveFrame>
  );
}

function MidiArcadePopup() {
  const close = useCloseImmersive('/arcade');
  const id = useParams().id ?? '';
  return (
    <ImmersiveFrame onClose={close} label="Arcade: MIDI importado">
      <Suspense fallback={<div className="arcade" />}>
        <MidiArcade id={id} onClose={close} />
      </Suspense>
    </ImmersiveFrame>
  );
}

function FocusPopup() {
  const { n = '', lessonId = '' } = useParams();
  const close = useCloseImmersive(`/estudo/unidade/${n}/${lessonId}`);
  return (
    <ImmersiveFrame onClose={close} label="Lição em modo foco">
      <Suspense fallback={<div className="focus" />}>
        <CourseFocusPage onClose={close} />
      </Suspense>
    </ImmersiveFrame>
  );
}

const IMMERSIVE = ['/arcade/midi/:id', '/arcade/:id', '/treino/foco', '/treino/notas', '/treino/sessao', '/partitura/:id', '/treino/calibrar', '/peca/:id/estudar', '/curso/musica/:songId', '/curso/foco/:n/:lessonId'];

export default function App() {
  const location = useLocation();
  const immersive = IMMERSIVE.some((p) => matchPath(p, location.pathname));
  // O popup abre por cima da página de onde você veio. Aberto direto pelo link, mostra Treino ou Repertório atrás.
  const focus = matchPath('/curso/foco/:n/:lessonId', location.pathname);
  const fallbackPath = focus
    ? `/estudo/unidade/${focus.params.n}/${focus.params.lessonId}`
    : location.pathname.startsWith('/partitura') || location.pathname.startsWith('/peca') ? '/repertorio' : location.pathname.startsWith('/arcade') ? '/arcade' : '/treino';
  const background: Location = (location.state as ImmersiveState | null)?.background ??
    (immersive ? { ...location, pathname: fallbackPath, search: '', state: null } : location);

  // Só entra quem tem conta. Sem conta (ou com a sessão expirada), qualquer endereço mostra a entrada;
  // depois do login, a mesma página abre.
  const account = useAccount();
  if (!account) {
    return (
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <NoteInputProvider>
        <LiveSoundProvider>
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
            <Route path="/estudo/unidade/:n" element={<CourseUnitPage />} />
            <Route path="/estudo/unidade/:n/:lessonId" element={<CourseLessonPage />} />
            <Route path="/progresso" element={<ProgressPage />} />
            <Route path="/arcade" element={<ArcadePage />} />
            <Route path="/consulta" element={<ReferencePage />} />
            <Route path="/consulta/:secao" element={<ReferencePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>

        {/* Modo imersivo: popup por cima da página */}
        {immersive && (
          <Routes>
            <Route path="/treino/sessao" element={<SessionPopup />} />
            <Route
              path="/treino/foco"
              element={<TreinoPopup label="Treino em tela de foco" render={(c) => <Suspense fallback={<div className="focus" />}><TreinoFocusPage onClose={c} /></Suspense>} />}
            />
            <Route
              path="/treino/notas"
              element={<TreinoPopup label="Leitura de notas" render={(c) => <Suspense fallback={<div className="focus" />}><NoteReadingPage onClose={c} /></Suspense>} />}
            />
            <Route path="/treino/calibrar" element={<TreinoPopup label="Ajustar atraso" render={(c) => <CalibratePage onClose={c} />} />} />
            <Route path="/partitura/:id" element={<SheetPopup />} />
            <Route path="/peca/:id/estudar" element={<ScorePopup />} />
            <Route path="/curso/musica/:songId" element={<CourseSongPopup />} />
            <Route path="/curso/foco/:n/:lessonId" element={<FocusPopup />} />
            <Route path="/arcade/:id" element={<ArcadePopup />} />
            <Route path="/arcade/midi/:id" element={<MidiArcadePopup />} />
          </Routes>
        )}
        </MetronomeProvider>
        </LiveSoundProvider>
      </NoteInputProvider>
    </ThemeProvider>
  );
}
