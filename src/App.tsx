import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import AppLayout from './components/AppLayout';
import TodayPage from './pages/TodayPage';
import PracticePage from './pages/PracticePage';
import UpcomingPage from './pages/UpcomingPage';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        {/* O treino ocupa a tela toda, sem a barra lateral. */}
        <Route path="/treino" element={<PracticePage />} />
        <Route element={<AppLayout />}>
          <Route index element={<TodayPage />} />
          <Route
            path="/repertorio"
            element={
              <UpcomingPage
                eyebrow="O que você aprendeu e quer aprender"
                title="Repertório"
                phase="Fase 4"
                items={[
                  'Cadastrar peças com o PDF da partitura',
                  'Filtros em botões que abrem painéis: tema, gênero, músicos, nível e estado',
                  'Estado de cada peça: quero aprender, aprendendo, aprendi, no repertório',
                ]}
              />
            }
          />
          <Route
            path="/estudo"
            element={
              <UpcomingPage
                eyebrow="Teoria para consultar"
                title="Estudo"
                phase="Fase 5"
                items={[
                  'Acordes desenhados no teclado, em qualquer tom e inversão',
                  'Escalas, intervalos e campo harmônico',
                  'Trilhas com o que você já aprendeu',
                ]}
              />
            }
          />
          <Route
            path="/progresso"
            element={
              <UpcomingPage
                eyebrow="Sua evolução"
                title="Progresso"
                phase="Fase 5"
                items={[
                  'Histórico de sessões de treino',
                  'Tempo para achar cada nota ao longo das semanas',
                  'As notas que você mais erra',
                ]}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
