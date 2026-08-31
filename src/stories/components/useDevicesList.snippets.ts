export const overviewSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function StudioDevices() {
  const {
    devices,
    videoInputs,
    audioInputs,
    audioOutputs,
    permissionGranted,
    isLoading,
    refresh,
    ensurePermissions,
  } = useDevicesList()

  return (
    <section>
      <p>Total devices: {devices.length}</p>
      <p>Cameras: {videoInputs.length}</p>
      <p>Microphones: {audioInputs.length}</p>
      <p>Speakers: {audioOutputs.length}</p>
      <p>{permissionGranted ? 'Permission granted' : 'Permission needed'}</p>
      <p>{isLoading ? 'Updating…' : 'Idle'}</p>

      <button type="button" onClick={() => void refresh()}>
        Refresh
      </button>
      <button type="button" onClick={() => void ensurePermissions()}>
        Allow camera and microphone
      </button>
    </section>
  )
}`

export const dashboardSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function DeviceDashboard() {
  const { videoInputs, audioInputs, audioOutputs, ensurePermissions, permissionGranted } =
    useDevicesList()

  return (
    <section>
      {!permissionGranted ? (
        <button type="button" onClick={() => void ensurePermissions()}>
          Allow access to reveal device labels
        </button>
      ) : null}

      <label>
        Camera
        <select>
          {videoInputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || 'Camera (label unavailable)'}
            </option>
          ))}
        </select>
      </label>

      <label>
        Microphone
        <select>
          {audioInputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || 'Microphone (label unavailable)'}
            </option>
          ))}
        </select>
      </label>

      <label>
        Speaker
        <select>
          {audioOutputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || 'Speaker (label unavailable)'}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}`

export const camerasSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function CameraList() {
  const { videoInputs } = useDevicesList()

  return (
    <ul>
      {videoInputs.map((device) => (
        <li key={device.deviceId}>
          <strong>{device.label || 'Unnamed camera'}</strong>
          <span>{device.deviceId.slice(0, 12)}…</span>
        </li>
      ))}
    </ul>
  )
}`

export const microphonesSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function MicrophoneList() {
  const { audioInputs } = useDevicesList()

  return (
    <ul>
      {audioInputs.map((device) => (
        <li key={device.deviceId}>
          {device.label || 'Microphone (label unavailable)'}
        </li>
      ))}
    </ul>
  )
}`

export const speakersSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function SpeakerList() {
  const { audioOutputs } = useDevicesList()

  return (
    <section>
      <p>Audio-output enumeration varies by browser and platform.</p>
      <ul>
        {audioOutputs.map((device) => (
          <li key={device.deviceId}>
            {device.label || 'Speaker (label unavailable)'}
          </li>
        ))}
      </ul>
    </section>
  )
}`

export const deviceChangesSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function DeviceChangeMonitor() {
  const { devices, videoInputs, audioInputs, audioOutputs } = useDevicesList()

  return (
    <section>
      <p>Total: {devices.length}</p>
      <p>Cameras: {videoInputs.length}</p>
      <p>Mics: {audioInputs.length}</p>
      <p>Speakers: {audioOutputs.length}</p>
      <p>
        Connect or remove hardware to fire <code>devicechange</code>. This
        Storybook demo simulates those events with mocks.
      </p>
    </section>
  )
}`

export const permissionWorkflowSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function PermissionWorkflow() {
  const {
    videoInputs,
    audioInputs,
    permissionGranted,
    ensurePermissions,
  } = useDevicesList()

  return (
    <section>
      {!permissionGranted ? (
        <button
          type="button"
          onClick={() => {
            void ensurePermissions()
          }}
        >
          Allow camera and microphone
        </button>
      ) : (
        <p>Permission checked · temporary tracks stopped</p>
      )}

      <p>Cameras: {videoInputs.length}</p>
      <p>Microphones: {audioInputs.length}</p>
      <ul>
        {[...videoInputs, ...audioInputs].map((device) => (
          <li key={device.deviceId}>
            {device.label || 'Label unavailable until permission'}
          </li>
        ))}
      </ul>
    </section>
  )
}`

export const permissionDeniedSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function PermissionDenied() {
  const { error, permissionGranted, devices, ensurePermissions } =
    useDevicesList()

  return (
    <section>
      <button type="button" onClick={() => void ensurePermissions()}>
        Retry permission
      </button>
      <p>{permissionGranted ? 'Granted' : 'Not granted'}</p>
      <p role="status">{error?.message ?? 'No error'}</p>
      <p>Known devices still listed: {devices.length}</p>
    </section>
  )
}`

export const enabledSnippet = `import { useState } from 'react'
import { useDevicesList } from '@muradyanvano/react-hooks'

export function EnabledDemo() {
  const [enabled, setEnabled] = useState(true)
  const { devices, isLoading } = useDevicesList({ enabled })

  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Device monitoring enabled
      </label>
      <p>{enabled ? 'Listening for devicechange' : 'Paused'}</p>
      <p>Devices retained: {devices.length}</p>
      <p>{isLoading ? 'Loading…' : 'Idle'}</p>
    </section>
  )
}`

export const refreshSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function ManualRefresh() {
  const { devices, isLoading, error, refresh } = useDevicesList()

  return (
    <section>
      <button type="button" onClick={() => void refresh()} disabled={isLoading}>
        {isLoading ? 'Refreshing…' : 'Refresh devices'}
      </button>
      <p role="status">{error?.message ?? \`\${devices.length} devices\`}</p>
    </section>
  )
}`

export const playgroundSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function Playground({
  enabled = true,
}: {
  enabled?: boolean
}) {
  const {
    devices,
    videoInputs,
    audioInputs,
    audioOutputs,
    permissionGranted,
    isLoading,
    error,
    refresh,
    ensurePermissions,
  } = useDevicesList({ enabled })

  return (
    <section>
      <button type="button" onClick={() => void refresh()}>
        Refresh
      </button>
      <button type="button" onClick={() => void ensurePermissions()}>
        Request permission
      </button>
      <p>Enabled: {String(enabled)}</p>
      <p>Devices: {devices.length}</p>
      <p>Cameras: {videoInputs.length}</p>
      <p>Mics: {audioInputs.length}</p>
      <p>Speakers: {audioOutputs.length}</p>
      <p>Permission: {permissionGranted ? 'granted' : 'not granted'}</p>
      <p>{isLoading ? 'Loading' : 'Idle'}</p>
      <p>{error?.message ?? 'No error'}</p>
    </section>
  )
}`

export const liveHardwareSnippet = `import { useDevicesList } from '@muradyanvano/react-hooks'

export function LiveHardwareDevices() {
  const {
    isSupported,
    devices,
    videoInputs,
    audioInputs,
    audioOutputs,
    permissionGranted,
    isLoading,
    error,
    refresh,
    ensurePermissions,
  } = useDevicesList()

  return (
    <section>
      <p>Supported: {String(isSupported)}</p>
      <button type="button" onClick={() => void ensurePermissions()}>
        Allow camera and microphone
      </button>
      <button type="button" onClick={() => void refresh()}>
        Refresh
      </button>
      <p>
        {devices.length} devices · {videoInputs.length} cameras ·{' '}
        {audioInputs.length} mics · {audioOutputs.length} speakers
      </p>
      <p>{permissionGranted ? 'Hook permission: granted' : 'Hook permission: needed'}</p>
      <p>{isLoading ? 'Loading' : 'Idle'}</p>
      <p>{error?.message ?? 'No error'}</p>
      {/*
        Pages cannot revoke camera/microphone in most browsers.
        Clear the site permission in browser settings, then remount
        (or reload) so hook-local permissionGranted resets.
      */}
    </section>
  )
}`
