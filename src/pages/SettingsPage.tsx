import { useEffect, useState, type FormEvent } from "react"

interface AppSettings {
  displayName: string
  email: string
  department: string
  language: string
  emailNotifications: boolean
  inAppNotifications: boolean
}

const defaultSettings: AppSettings = {
  displayName: "Administrator",
  email: "admin@servicehub.com",
  department: "IT Department",
  language: "English",
  emailNotifications: true,
  inAppNotifications: true,
}

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("servicehub_settings")
    return saved ? JSON.parse(saved) : defaultSettings
  })

  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    localStorage.setItem("servicehub_settings", JSON.stringify(settings))
  }, [settings])

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target

    setSettings((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : value,
    }))
  }

  const handleSave = (event: FormEvent) => {
    event.preventDefault()
    localStorage.setItem("servicehub_settings", JSON.stringify(settings))
    setSavedMessage("Settings saved successfully!")
    setTimeout(() => setSavedMessage(""), 3000)
  }

  return (
    <section className="content-card">
      <h2 className="section-title">Application Settings</h2>
      <p className="page-subtitle">
        Manage your profile and application preferences.
      </p>

      <form onSubmit={handleSave}>
        <h3>Profile Information</h3>

        <div className="form-group">
          <label>Display Name</label>
          <input
            name="displayName"
            value={settings.displayName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={settings.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Department</label>
          <input
            name="department"
            value={settings.department}
            onChange={handleChange}
            required
          />
        </div>

        <h3>Preferences</h3>

        <div className="form-group">
          <label>Language</label>
          <select
            name="language"
            value={settings.language}
            onChange={handleChange}
          >
            <option value="English">English</option>
            <option value="Amharic">Amharic</option>
          </select>
        </div>

        <h3>Notifications</h3>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="emailNotifications"
              checked={settings.emailNotifications}
              onChange={handleChange}
            />
            Receive email notifications
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="inAppNotifications"
              checked={settings.inAppNotifications}
              onChange={handleChange}
            />
            Receive in-app notifications
          </label>
        </div>

        <button type="submit" className="primary-button">
          Save Settings
        </button>

        {savedMessage && <p>{savedMessage}</p>}
      </form>
    </section>
  )
}

export default SettingsPage