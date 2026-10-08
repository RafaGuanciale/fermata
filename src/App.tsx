import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { NoteInputProvider } from './input/NoteInputProvider';
import AppLayout from './components/AppLayout';
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

export default function App() {
  return (
    <ThemeProvider>
      <NoteInputProvider>
        <Routes>
          {/* Modo imersivo: tela cheia, sem barra lateral */}
          <Route path="/treino/sessao" element={<PracticeSessionPage />} />
          <Route
            path="/partitura/:id"
            element={
              <Suspense fallback={<div className="viewer" />}>
                <SheetViewerPage />
              </Suspense>
            }
          />

          {/* Páginas com a barra lateral e o teclado fixo */}
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
      </NoteInputProvider>
    </ThemeProvider>
  );
}
