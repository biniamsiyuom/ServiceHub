
import { useEffect, useState } from "react"

interface StaffMember {
  id: number
  name: string
  email: string
  department: string
  role: string
  phone: string
}

const initialStaff: StaffMember[] = [
  {
    id: 1,
    name: "John Smith",
    email: "john@example.com",
    department: "IT",
    role: "IT Support",
    phone: "0912345678",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah@example.com",
    department: "Human Resources",
    role: "HR Officer",
    phone: "0923456789",
  },
]

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const savedStaff = localStorage.getItem("servicehub_staff")
    return savedStaff ? JSON.parse(savedStaff) : initialStaff
  })

  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    localStorage.setItem("servicehub_staff", JSON.stringify(staff))
  }, [staff])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const data = new FormData(event.currentTarget)

    const staffData = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      department: String(data.get("department") || ""),
      role: String(data.get("role") || ""),
      phone: String(data.get("phone") || ""),
    }

    if (editingId !== null) {
      setStaff((current) =>
        current.map((member) =>
          member.id === editingId
            ? { ...member, ...staffData }
            : member
        )
      )
    } else {
      const newMember: StaffMember = {
        id: Date.now(),
        ...staffData,
      }

      setStaff((current) => [...current, newMember])
    }

    setShowForm(false)
    setEditingId(null)
  }

  function deleteStaff(id: number) {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      setStaff((current) => current.filter((member) => member.id !== id))
    }
  }

  const currentStaff = staff.find((member) => member.id === editingId)

  const filteredStaff = staff.filter((member) =>
    [
      member.name,
      member.email,
      member.department,
      member.role,
      member.phone,
    ].some((value) => value.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <section className="content-card">
      <h2 className="section-title">Staff Management</h2>
      <p className="page-subtitle">
        Add, edit, search and manage staff members.
      </p>

      <div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
        >
          + Add Staff
        </button>

        <input
          type="search"
          placeholder="Search staff..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}>
          <h3>{editingId !== null ? "Edit Staff Member" : "Add New Staff"}</h3>

          <input
            name="name"
            placeholder="Full name"
            defaultValue={currentStaff?.name || ""}
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email address"
            defaultValue={currentStaff?.email || ""}
            required
          />

          <input
            name="department"
            placeholder="Department"
            defaultValue={currentStaff?.department || ""}
            required
          />

          <input
            name="role"
            placeholder="Job role"
            defaultValue={currentStaff?.role || ""}
            required
          />

          <input
            name="phone"
            placeholder="Phone number"
            defaultValue={currentStaff?.phone || ""}
            required
          />

          <button type="submit">
            {editingId !== null ? "Save Changes" : "Add Staff"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowForm(false)
              setEditingId(null)
            }}
          >
            Cancel
          </button>
        </form>
      )}

      <p>
        <strong>Total Staff Members: {staff.length}</strong>
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredStaff.map((member) => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td>{member.email}</td>
              <td>{member.department}</td>
              <td>{member.role}</td>
              <td>{member.phone}</td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(member.id)
                    setShowForm(true)
                  }}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => deleteStaff(member.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredStaff.length === 0 && (
        <p className="empty-message">No staff members found.</p>
      )}
    </section>
  )
}
