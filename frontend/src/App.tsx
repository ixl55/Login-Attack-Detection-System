import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { I18nProvider } from './i18n/I18nProvider'
import { RangeProvider } from './lib/range'
import { EventsPage } from './pages/EventsPage'
import { InvestigationPage } from './pages/InvestigationPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { ThemeProvider } from './theme/ThemeProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 2_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <RangeProvider>
            <BrowserRouter basename="/dashboard">
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<OverviewPage />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="investigate" element={<InvestigationPage />} />
                  <Route path="investigate/user/:value" element={<InvestigationPage kind="user" />} />
                  <Route path="investigate/ip/:value" element={<InvestigationPage kind="ip" />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </RangeProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
