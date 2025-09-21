import { useUI } from '../../store/useUI'
export default function Toast(){
  const { toast } = useUI()
  if(!toast) return null
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-3 border">
      <div className="font-medium">{toast.msg}</div>
    </div>
  )
}
