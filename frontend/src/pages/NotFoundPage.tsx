import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/States'
import { useI18n } from '../i18n/context'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <EmptyState
      icon={Compass}
      title={t('notFound.title')}
      action={
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          {t('notFound.back')}
        </Link>
      }
    />
  )
}
