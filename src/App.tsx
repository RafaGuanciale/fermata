import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, matchPath, useLocation, type Location } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { NoteInputProvider } from './input/NoteInputProvider';
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
import UpcomingPage from './pages/UpcomingPage';

// O leitor de PDF é pesado: só carrega quando você abre uma partitura.
const SheetViewerPage = lazy(() => import('./pages/SheetViewerPage'));

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

const IMMERSIVE = ['/treino/sessao', '/partitura/:id'];

export default function App() {
  const location = useLocation();
  const immersive = IMMERSIVE.some((p) => matchPath(p, location.pathname));
  // O popup abre por cima da página de onde você veio. Aberto direto pelo link, mostra Treino ou Repertório atrás.
  const background: Location = (location.state as ImmersiveState | null)?.background ??
    (immersive ? { ...location, pathname: location.pathname.startsWith('/partitura') ? '/repertorio' : '/treino', search: '', state: null } : location);

  return (
    <ThemeProvider>
      <NoteInputProvider>
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
            <Route path="/estudo" element={<StudyPage />} />
            <Route path="/estudo/:moduleId" element={<ModulePage />} />
            <Route path="/estudo/:moduleId/:lessonId" element={<LessonPage />} />
            <Route
              path="/progresso"
              element={
                <UpcomingPage
                  eyebrow="Sua evolução"
                  title="Progresso"
                  phase="Próxima fase"
                  items={['Histórico de sessões de treino', 'Tempo para achar cada nota ao longo das semanas', 'Mapa do que você já aprendeu no Estudo e no Repertório']}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>

        {/* Modo imersivo: popup por cima da página */}
        {immersive && (
          <Routes>
            <Route path="/treino/sessao" element={<SessionPopup />} />
            <Route path="/partitura/:id" element={<SheetPopup />} />
          </Routes>
        )}
      </NoteInputProvider>
    </ThemeProvider>
  );
}
