import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import { useDevicesList } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  createMediaDevicesMock,
  DEFAULT_LABELED_DEVICES,
  UNLABELED_DEVICES,
  type MediaDevicesMockController,
  type MockDeviceSpec,
  type PermissionOutcome,
} from './mediaDevicesMock'
import {
  dashboardSnippet,
  deviceChangesSnippet,
  enabledSnippet,
  liveHardwareSnippet,
  overviewSnippet,
  permissionDeniedSnippet,
  permissionWorkflowSnippet,
  playgroundSnippet,
  refreshSnippet,
} from './useDevicesList.snippets'

type BrowserPermissionLabel = PermissionState | 'unsupported' | 'unknown'

type PermissionsWithRevoke = Permissions & {
  revoke?: (descriptor: PermissionDescriptor) => Promise<PermissionStatus>
}

function useSiteMediaPermissions() {
  const [camera, setCamera] = useState<BrowserPermissionLabel>('unknown')
  const [microphone, setMicrophone] =
    useState<BrowserPermissionLabel>('unknown')
  const [revokeNote, setRevokeNote] = useState<string | null>(null)

  const refreshSitePermissions = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      setCamera('unsupported')
      setMicrophone('unsupported')
      return
    }

    const read = async (
      name: string,
      set: (value: BrowserPermissionLabel) => void,
    ) => {
      try {
        const status = await navigator.permissions.query({
          name: name as PermissionName,
        })
        set(status.state)
        status.onchange = () => {
          set(status.state)
        }
      } catch {
        set('unsupported')
      }
    }

    await Promise.all([
      read('camera', setCamera),
      read('microphone', setMicrophone),
    ])
  }, [])

  const tryRevokeSitePermissions = useCallback(async () => {
    const permissions = navigator.permissions as
      PermissionsWithRevoke | undefined
    if (typeof permissions?.revoke !== 'function') {
      setRevokeNote(
        'Browsers cannot revoke camera/microphone from a page. Clear this site in browser settings, then Remount hook.',
      )
      return
    }

    try {
      await permissions.revoke({ name: 'camera' as PermissionName })
      await permissions.revoke({ name: 'microphone' as PermissionName })
      setRevokeNote(
        'Browser accepted revoke. Remount the hook to clear hook-local permissionGranted.',
      )
      await refreshSitePermissions()
    } catch {
      setRevokeNote(
        'Revoke failed. Clear Camera and Microphone for this site in browser settings, then Remount hook.',
      )
    }
  }, [refreshSitePermissions])

  return {
    camera,
    microphone,
    revokeNote,
    refreshSitePermissions,
    tryRevokeSitePermissions,
  }
}

function shortId(deviceId: string): string {
  return deviceId.length <= 14 ? deviceId : `${deviceId.slice(0, 12)}…`
}

function deviceLabel(label: string, fallback: string): string {
  return label.trim() ? label : fallback
}

function WithMediaDevicesMock({
  children,
  initialDevices = UNLABELED_DEVICES,
  permissionOutcome = 'granted',
  permissionGrantedLabels = false,
  onReady,
}: {
  children: (controller: MediaDevicesMockController) => ReactNode
  initialDevices?: MockDeviceSpec[]
  permissionOutcome?: PermissionOutcome
  permissionGrantedLabels?: boolean
  onReady?: ((controller: MediaDevicesMockController) => void) | undefined
}) {
  const [controller] = useState(() =>
    createMediaDevicesMock({
      initialDevices,
      permissionOutcome,
      permissionGrantedLabels,
    }),
  )

  // Install during render so children see the mock before their effects run.
  // Re-install after Strict Mode cleanup (useState initializer does not re-run).
  if (!controller.isInstalled()) {
    controller.install()
  }

  useEffect(() => {
    controller.install()
    onReady?.(controller)
    return () => {
      controller.uninstall()
    }
  }, [controller, onReady])

  return <>{children(controller)}</>
}

function DeviceKindBadge({ kind }: { kind: MediaDeviceKind }) {
  const label =
    kind === 'videoinput'
      ? 'Camera'
      : kind === 'audioinput'
        ? 'Microphone'
        : 'Speaker'
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-700 uppercase">
      {label}
    </span>
  )
}

export function OverviewExample() {
  return (
    <WithMediaDevicesMock initialDevices={UNLABELED_DEVICES}>
      {() => <OverviewBody />}
    </WithMediaDevicesMock>
  )
}

function OverviewBody() {
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
  const [updatedAt, setUpdatedAt] = useState('Just now')

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Studio devices"
      description="Enumerate cameras, microphones, and speakers. Request permission explicitly, then refresh as hardware changes."
      instruction="Use Refresh or Allow access. Storybook uses deterministic mocks — no real camera or microphone is opened."
      badge={isLoading ? 'Loading' : 'Ready'}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Total',
              value: String(devices.length),
              testId: 'overview-total',
            },
            {
              label: 'Cameras',
              value: String(videoInputs.length),
              testId: 'overview-cameras',
            },
            {
              label: 'Mics',
              value: String(audioInputs.length),
              testId: 'overview-mics',
            },
            {
              label: 'Speakers',
              value: String(audioOutputs.length),
              testId: 'overview-speakers',
            },
            {
              label: 'Permission',
              value: permissionGranted ? 'Granted' : 'Needed',
              testId: 'overview-permission',
            },
            {
              label: 'Loading',
              value: isLoading ? 'true' : 'false',
              testId: 'overview-loading',
            },
            { label: 'Updated', value: updatedAt, testId: 'overview-updated' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="overview-refresh"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void refresh().then(() => {
              setUpdatedAt(new Date().toLocaleTimeString())
            })
          }}
        >
          Refresh
        </button>
        <button
          type="button"
          data-testid="overview-allow"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void ensurePermissions()
          }}
        >
          Allow camera and microphone
        </button>
      </div>
      <p
        className="mt-3 text-sm text-slate-600"
        role="status"
        aria-live="polite"
        data-testid="overview-status"
      >
        {isLoading
          ? 'Updating device list…'
          : `${devices.length} devices available.`}
      </p>
    </ExampleShowcase>
  )
}

export function DeviceDashboardExample() {
  return (
    <WithMediaDevicesMock initialDevices={UNLABELED_DEVICES}>
      {() => <DashboardBody />}
    </WithMediaDevicesMock>
  )
}

function DashboardBody() {
  const {
    videoInputs,
    audioInputs,
    audioOutputs,
    permissionGranted,
    ensurePermissions,
  } = useDevicesList()
  const cameraId = useId()
  const micId = useId()
  const speakerId = useId()

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Device dashboard"
      description="Settings-style selectors for cameras, microphones, and speakers. Selecting a device does not activate a stream — this hook only lists devices."
      instruction="Allow access to reveal labels, then browse the selectors."
      code={dashboardSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Permission',
              value: permissionGranted ? 'Granted' : 'Needed',
              testId: 'dashboard-permission',
            },
            {
              label: 'Cameras',
              value: String(videoInputs.length),
              testId: 'dashboard-cameras',
            },
          ]}
        />
      }
    >
      {!permissionGranted ? (
        <button
          type="button"
          data-testid="dashboard-allow"
          className="mb-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void ensurePermissions()
          }}
        >
          Allow access to reveal device labels
        </button>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <label
          className="block space-y-1 text-sm text-slate-700"
          htmlFor={cameraId}
        >
          Camera
          <select
            id={cameraId}
            data-testid="dashboard-camera-select"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {videoInputs.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {deviceLabel(device.label, 'Camera (label unavailable)')}
              </option>
            ))}
          </select>
        </label>
        <label
          className="block space-y-1 text-sm text-slate-700"
          htmlFor={micId}
        >
          Microphone
          <select
            id={micId}
            data-testid="dashboard-mic-select"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {audioInputs.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {deviceLabel(device.label, 'Microphone (label unavailable)')}
              </option>
            ))}
          </select>
        </label>
        <label
          className="block space-y-1 text-sm text-slate-700"
          htmlFor={speakerId}
        >
          Speaker
          <select
            id={speakerId}
            data-testid="dashboard-speaker-select"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {audioOutputs.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {deviceLabel(device.label, 'Speaker (label unavailable)')}
              </option>
            ))}
          </select>
        </label>
      </div>
    </ExampleShowcase>
  )
}

export function DeviceChangesExample() {
  return (
    <WithMediaDevicesMock
      initialDevices={DEFAULT_LABELED_DEVICES}
      permissionGrantedLabels
    >
      {(controller) => <DeviceChangesBody controller={controller} />}
    </WithMediaDevicesMock>
  )
}

function DeviceChangesBody({
  controller,
}: {
  controller: MediaDevicesMockController
}) {
  const { devices, videoInputs, audioInputs, audioOutputs } = useDevicesList()
  const [log, setLog] = useState<string[]>([])

  const pushLog = (message: string) => {
    setLog((entries) => [message, ...entries].slice(0, 6))
  }

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Device changes"
      description="Simulated hardware connect/remove events dispatch mocked devicechange so the hook refreshes naturally."
      instruction="Connect or remove devices with the controls and watch counts update."
      code={deviceChangesSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Total',
              value: String(devices.length),
              testId: 'changes-total',
            },
            {
              label: 'Cameras',
              value: String(videoInputs.length),
              testId: 'changes-cameras',
            },
            {
              label: 'Mics',
              value: String(audioInputs.length),
              testId: 'changes-mics',
            },
            {
              label: 'Speakers',
              value: String(audioOutputs.length),
              testId: 'changes-speakers',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="connect-camera"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            controller.connectDevice({
              deviceId: 'cam-extra',
              kind: 'videoinput',
              label: 'Capture Card',
              groupId: 'group-extra',
            })
            pushLog('Connected camera')
          }}
        >
          Connect camera
        </button>
        <button
          type="button"
          data-testid="remove-mic"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            controller.removeDevice('mic-headset')
            pushLog('Removed microphone')
          }}
        >
          Remove microphone
        </button>
        <button
          type="button"
          data-testid="connect-speaker"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            controller.connectDevice({
              deviceId: 'spk-hdmi',
              kind: 'audiooutput',
              label: 'HDMI Display Audio',
              groupId: 'group-hdmi',
            })
            pushLog('Connected speaker')
          }}
        >
          Connect speaker
        </button>
        <button
          type="button"
          data-testid="restore-devices"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            controller.restoreDefaults()
            pushLog('Restored defaults')
          }}
        >
          Restore defaults
        </button>
      </div>
      <ul
        className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
        data-testid="changes-log"
        aria-live="polite"
      >
        {log.length === 0 ? <li>No simulated events yet</li> : null}
        {log.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}

export function PermissionWorkflowExample() {
  return (
    <WithMediaDevicesMock initialDevices={UNLABELED_DEVICES}>
      {(controller) => <PermissionWorkflowBody controller={controller} />}
    </WithMediaDevicesMock>
  )
}

function PermissionWorkflowBody({
  controller,
}: {
  controller: MediaDevicesMockController
}) {
  const { videoInputs, audioInputs, permissionGranted, ensurePermissions } =
    useDevicesList()

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Permission workflow"
      description="Start with empty labels. An explicit Allow access button calls ensurePermissions(). Temporary tracks are stopped immediately."
      instruction="Click Allow access. Labels appear and a privacy confirmation shows that tracks were stopped."
      code={permissionWorkflowSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Permission',
              value: permissionGranted ? 'Granted' : 'Needed',
              testId: 'permission-state',
            },
            {
              label: 'Tracks stopped',
              value: String(controller.getStoppedTrackCount()),
              testId: 'tracks-stopped',
            },
          ]}
        />
      }
    >
      {!permissionGranted ? (
        <button
          type="button"
          data-testid="allow-access"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void ensurePermissions()
          }}
        >
          Allow camera and microphone
        </button>
      ) : (
        <p
          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
          role="status"
          data-testid="privacy-confirmation"
        >
          Permission checked · temporary tracks stopped
        </p>
      )}
      <ul
        className="mt-3 space-y-1 text-sm text-slate-700"
        data-testid="permission-labels"
      >
        {[...videoInputs, ...audioInputs].map((device) => (
          <li key={device.deviceId}>
            {deviceLabel(device.label, 'Label unavailable until permission')}
          </li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}

export function PermissionDeniedExample() {
  return (
    <WithMediaDevicesMock
      initialDevices={DEFAULT_LABELED_DEVICES}
      permissionOutcome="denied"
      permissionGrantedLabels
    >
      {() => <PermissionDeniedBody />}
    </WithMediaDevicesMock>
  )
}

function PermissionDeniedBody() {
  const { error, permissionGranted, devices, ensurePermissions } =
    useDevicesList()

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Permission denied"
      description="A rejected permission request stores a normalized error, keeps the existing device list, and never leaves an unhandled rejection."
      instruction="Click Retry permission to simulate another denial, then review the friendly error."
      code={permissionDeniedSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Permission',
              value: permissionGranted ? 'Granted' : 'Not granted',
              testId: 'denied-permission',
            },
            {
              label: 'Devices',
              value: String(devices.length),
              testId: 'denied-devices',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        data-testid="retry-permission"
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        onClick={() => {
          void ensurePermissions()
        }}
      >
        Retry permission
      </button>
      <p
        className="mt-3 text-sm text-slate-700"
        role="status"
        aria-live="polite"
        data-testid="denied-error"
      >
        {error?.message ?? 'No error yet — retry to simulate denial.'}
      </p>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  return (
    <WithMediaDevicesMock
      initialDevices={DEFAULT_LABELED_DEVICES}
      permissionGrantedLabels
    >
      {(controller) => <EnabledStateBody controller={controller} />}
    </WithMediaDevicesMock>
  )
}

function EnabledStateBody({
  controller,
}: {
  controller: MediaDevicesMockController
}) {
  const [enabled, setEnabled] = useState(true)
  const checkboxId = useId()
  const { devices, isLoading } = useDevicesList({ enabled })

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Enabled state"
      description="While disabled, devicechange does not update. The latest successful list remains visible. Re-enabling refreshes."
      instruction="Load devices, disable monitoring, simulate a connect (no update), then re-enable."
      badge={enabled ? 'Listening' : 'Paused'}
      code={enabledSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: enabled ? 'true' : 'false',
              testId: 'devices-enabled',
            },
            {
              label: 'Devices',
              value: String(devices.length),
              testId: 'enabled-count',
            },
            {
              label: 'Loading',
              value: isLoading ? 'true' : 'false',
              testId: 'enabled-loading',
            },
          ]}
        />
      }
    >
      <label
        htmlFor={checkboxId}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
      >
        <input
          id={checkboxId}
          data-testid="devices-enabled-checkbox"
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked)
          }}
          className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        Device monitoring enabled
      </label>
      <button
        type="button"
        data-testid="enabled-connect"
        className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        onClick={() => {
          controller.connectDevice({
            deviceId: 'cam-while-disabled',
            kind: 'videoinput',
            label: 'Extra Camera',
            groupId: 'group-extra',
          })
        }}
      >
        Simulate connect
      </button>
    </ExampleShowcase>
  )
}

export function ManualRefreshExample() {
  return (
    <WithMediaDevicesMock
      initialDevices={DEFAULT_LABELED_DEVICES}
      permissionGrantedLabels
    >
      {(controller) => <ManualRefreshBody controller={controller} />}
    </WithMediaDevicesMock>
  )
}

function ManualRefreshBody({
  controller,
}: {
  controller: MediaDevicesMockController
}) {
  const { devices, isLoading, error, refresh } = useDevicesList()
  const [updatedAt, setUpdatedAt] = useState('—')

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Manual refresh"
      description="Call refresh() to re-enumerate. Enumeration failures preserve the previous successful list."
      instruction="Refresh successfully, force a failure, then refresh again to recover."
      code={refreshSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Devices',
              value: String(devices.length),
              testId: 'refresh-count',
            },
            {
              label: 'Loading',
              value: isLoading ? 'true' : 'false',
              testId: 'refresh-loading',
            },
            { label: 'Updated', value: updatedAt, testId: 'refresh-updated' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="manual-refresh"
          disabled={isLoading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
          onClick={() => {
            void refresh().then(() => {
              setUpdatedAt(new Date().toLocaleTimeString())
            })
          }}
        >
          {isLoading ? 'Refreshing…' : 'Refresh devices'}
        </button>
        <button
          type="button"
          data-testid="force-enum-error"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            controller.setEnumerationOutcome('error')
          }}
        >
          Next refresh fails
        </button>
        <button
          type="button"
          data-testid="clear-enum-error"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            controller.setEnumerationOutcome('success')
          }}
        >
          Next refresh succeeds
        </button>
      </div>
      <p
        className="mt-3 text-sm text-slate-700"
        role="status"
        aria-live="polite"
        data-testid="refresh-status"
      >
        {error?.message ?? `${devices.length} devices`}
      </p>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
}: {
  enabled?: boolean | undefined
}) {
  return (
    <WithMediaDevicesMock
      initialDevices={DEFAULT_LABELED_DEVICES}
      permissionGrantedLabels
    >
      {() => <PlaygroundBody enabled={enabled} />}
    </WithMediaDevicesMock>
  )
}

function PlaygroundBody({ enabled }: { enabled: boolean }) {
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
    <ExampleShowcase
      hookName="useDevicesList"
      title="Playground"
      description="Toggle enabled via Storybook controls. Prefer explicit permission buttons over automatic requestPermissions."
      instruction="Use Refresh and Request permission. Controls change enabled without real hardware prompts."
      badge={enabled ? 'Enabled' : 'Disabled'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: enabled ? 'true' : 'false',
              testId: 'playground-enabled',
            },
            {
              label: 'Devices',
              value: String(devices.length),
              testId: 'playground-total',
            },
            {
              label: 'Permission',
              value: permissionGranted ? 'granted' : 'needed',
              testId: 'playground-permission',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="playground-refresh"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void refresh()
          }}
        >
          Refresh
        </button>
        <button
          type="button"
          data-testid="playground-request"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void ensurePermissions()
          }}
        >
          Request permission
        </button>
      </div>
      <p
        className="mt-3 text-sm text-slate-600"
        role="status"
        aria-live="polite"
        data-testid="playground-status"
      >
        Cameras {videoInputs.length} · Mics {audioInputs.length} · Speakers{' '}
        {audioOutputs.length}
        {isLoading ? ' · Loading' : ''}
        {error ? ` · ${error.message}` : ''}
      </p>
    </ExampleShowcase>
  )
}

export function LiveHardwareExample() {
  const [instance, setInstance] = useState(0)

  return (
    <LiveHardwareBody
      key={instance}
      onRemount={() => {
        setInstance((value) => value + 1)
      }}
    />
  )
}

function LiveHardwareBody({ onRemount }: { onRemount: () => void }) {
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
  const {
    camera,
    microphone,
    revokeNote,
    refreshSitePermissions,
    tryRevokeSitePermissions,
  } = useSiteMediaPermissions()

  return (
    <ExampleShowcase
      hookName="useDevicesList"
      title="Live hardware"
      description="Uses the real navigator.mediaDevices API (no Storybook mock). Allow will prompt for your camera and microphone. Temporary tracks are still stopped immediately by the hook."
      instruction="Click Allow to grant access. To re-test the prompt: clear Camera/Microphone for this Storybook origin in browser site settings, click Remove site permission (best-effort), then Remount hook."
      badge="Real devices"
      code={liveHardwareSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'live-supported',
            },
            {
              label: 'Devices',
              value: String(devices.length),
              testId: 'live-total',
            },
            {
              label: 'Hook permission',
              value: permissionGranted ? 'Granted' : 'Needed',
              testId: 'live-hook-permission',
            },
            {
              label: 'Site camera',
              value: camera,
              testId: 'live-site-camera',
            },
            {
              label: 'Site mic',
              value: microphone,
              testId: 'live-site-mic',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="live-allow"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void ensurePermissions().then(() => {
              void refreshSitePermissions()
            })
          }}
        >
          Allow camera and microphone
        </button>
        <button
          type="button"
          data-testid="live-refresh"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void refresh()
          }}
        >
          Refresh
        </button>
        <button
          type="button"
          data-testid="live-site-status"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            void refreshSitePermissions()
          }}
        >
          Check site permission
        </button>
        <button
          type="button"
          data-testid="live-revoke"
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800 outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          onClick={() => {
            void tryRevokeSitePermissions()
          }}
        >
          Remove site permission
        </button>
        <button
          type="button"
          data-testid="live-remount"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={onRemount}
        >
          Remount hook
        </button>
      </div>

      <div
        className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        data-testid="live-reset-help"
      >
        <p className="font-semibold">Resetting permission for local re-tests</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            Open the lock / tune icon next to the Storybook URL → Site settings.
          </li>
          <li>
            Set Camera and Microphone to Ask (or Reset permissions), then close
            the panel.
          </li>
          <li>
            Click Remount hook here so hook-local{' '}
            <code className="rounded bg-amber-100 px-1">permissionGranted</code>{' '}
            resets.
          </li>
          <li>Click Allow again to see the browser prompt.</li>
        </ol>
        <p>
          Chrome/Edge: Settings → Privacy → Site settings → Camera / Microphone,
          find this origin. Firefox: Permissions in the address-bar panel.
        </p>
      </div>

      {revokeNote ? (
        <p
          className="mt-3 text-sm text-slate-700"
          role="status"
          aria-live="polite"
          data-testid="live-revoke-note"
        >
          {revokeNote}
        </p>
      ) : null}

      <p
        className="mt-3 text-sm text-slate-600"
        role="status"
        aria-live="polite"
        data-testid="live-status"
      >
        Cameras {videoInputs.length} · Mics {audioInputs.length} · Speakers{' '}
        {audioOutputs.length}
        {isLoading ? ' · Loading' : ''}
        {error ? ` · ${error.message}` : ''}
      </p>

      <ul
        className="mt-3 space-y-1 text-sm text-slate-700"
        data-testid="live-device-list"
      >
        {devices.map((device) => (
          <li key={`${device.kind}-${device.deviceId}`}>
            <DeviceKindBadge kind={device.kind} />{' '}
            {deviceLabel(device.label, 'Label unavailable until permission')}{' '}
            <span className="text-slate-400">({shortId(device.deviceId)})</span>
          </li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}
