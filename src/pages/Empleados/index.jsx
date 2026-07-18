import { useEffect, useRef, useState } from 'react'
import { useEmpleados } from '../../hooks/useEmpleados'
import { EmpleadoForm } from '../../components/empleados/EmpleadoForm'
import { EmpleadoTable } from '../../components/empleados/EmpleadoTable'

export default function Empleados() {
  const { empleados, loading, error, addEmpleado, editEmpleado, toggleActivo } = useEmpleados()
  const [editing, setEditing] = useState(null)
  const formRef = useRef(null)

  useEffect(() => {
    if (editing) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editing])

  async function handleCreate(values) {
    await addEmpleado(values)
  }

  async function handleUpdate(values) {
    await editEmpleado(editing.id, values)
    setEditing(null)
  }

  return (
    <div className="page">
      <h1>Empleados</h1>

      <div className="card" ref={formRef} style={editing ? { borderColor: 'var(--color-primary)' } : undefined}>
        <h2 style={{ marginTop: 0 }}>{editing ? `Editar: ${editing.nombre_completo}` : 'Nuevo empleado'}</h2>
        <EmpleadoForm
          key={editing?.id ?? 'new'}
          initialValues={editing ?? undefined}
          submitLabel={editing ? 'Guardar cambios' : 'Agregar empleado'}
          onSubmit={editing ? handleUpdate : handleCreate}
        />
        {editing && (
          <button type="button" className="btn" style={{ marginTop: 'var(--space-3)' }} onClick={() => setEditing(null)}>
            Cancelar edición
          </button>
        )}
      </div>

      <h2>Listado</h2>
      {loading && <p className="text-muted">Cargando...</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && (
        <EmpleadoTable empleados={empleados} onToggleActivo={toggleActivo} onEdit={setEditing} />
      )}
    </div>
  )
}
