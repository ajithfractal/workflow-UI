import { useState, useCallback } from 'react'

export const useModal = () => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showCancel: false,
  })

  const showModal = useCallback(({ title, message, type = 'info', onConfirm, showCancel = false }) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      showCancel,
    })
  }, [])

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const showAlert = useCallback((message, type = 'info', title) => {
    showModal({ title, message, type, showCancel: false })
  }, [showModal])

  const showConfirm = useCallback((message, onConfirm, title = 'Confirm', type = 'warning') => {
    showModal({ title, message, type, onConfirm, showCancel: true })
  }, [showModal])

  return {
    modal,
    showModal,
    closeModal,
    showAlert,
    showConfirm,
  }
}
