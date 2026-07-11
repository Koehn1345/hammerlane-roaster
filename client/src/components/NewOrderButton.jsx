import { useState } from 'react'
import Modal from './Modal'
import OrderForm from './OrderForm'

function NewOrderButton({ onCreated }) {
  const [open, setOpen] = useState(false)

  const handleSaved = (order) => {
    setOpen(false)
    onCreated?.(order)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-amber-800 px-5 py-3 text-sm font-medium text-amber-50 shadow-lg transition-colors hover:bg-amber-900"
      >
        <span className="text-lg leading-none">+</span> New Order
      </button>

      {open && (
        <Modal title="New Order" onClose={() => setOpen(false)}>
          <OrderForm order={null} onSaved={handleSaved} onCancel={() => setOpen(false)} />
        </Modal>
      )}
    </>
  )
}

export default NewOrderButton
