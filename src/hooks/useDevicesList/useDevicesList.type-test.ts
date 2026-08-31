import { expectTypeOf } from 'vitest'

import {
  useDevicesList,
  type UseDevicesListOptions,
  type UseDevicesListReturn,
  type UseDevicesListUpdatedHandler,
} from '../../index'
import {
  useDevicesList as useDevicesListLocal,
  type UseDevicesListReturn as LocalReturn,
} from './useDevicesList'

export function __typeTests(): void {
  const onUpdated: UseDevicesListUpdatedHandler = (devices) => {
    expectTypeOf(devices).toEqualTypeOf<readonly MediaDeviceInfo[]>()
  }

  expectTypeOf(useDevicesList).toBeFunction()
  expectTypeOf(useDevicesListLocal).toEqualTypeOf(useDevicesList)
  expectTypeOf<LocalReturn>().toEqualTypeOf<UseDevicesListReturn>()

  expectTypeOf<UseDevicesListOptions>().toMatchTypeOf<{
    enabled?: boolean
    requestPermissions?: boolean
    constraints?: MediaStreamConstraints
    onUpdated?: UseDevicesListUpdatedHandler
  }>()

  const empty = useDevicesList()
  expectTypeOf(empty).toEqualTypeOf<UseDevicesListReturn>()
  expectTypeOf(empty.devices).toEqualTypeOf<readonly MediaDeviceInfo[]>()
  expectTypeOf(empty.videoInputs).toEqualTypeOf<readonly MediaDeviceInfo[]>()
  expectTypeOf(empty.audioInputs).toEqualTypeOf<readonly MediaDeviceInfo[]>()
  expectTypeOf(empty.audioOutputs).toEqualTypeOf<readonly MediaDeviceInfo[]>()
  expectTypeOf(empty.refresh).returns.toEqualTypeOf<Promise<void>>()
  expectTypeOf(empty.ensurePermissions).returns.toEqualTypeOf<
    Promise<boolean>
  >()

  const configured = useDevicesList({
    enabled: true,
    requestPermissions: false,
    constraints: { audio: true, video: { facingMode: 'user' } },
    onUpdated,
  })
  expectTypeOf(configured).toEqualTypeOf<UseDevicesListReturn>()

  void onUpdated
  void configured

  // @ts-expect-error readonly arrays reject assignment
  empty.devices.push(empty.devices[0] as MediaDeviceInfo)

  // @ts-expect-error invalid enabled value
  useDevicesList({ enabled: 'yes' })

  // @ts-expect-error invalid requestPermissions value
  useDevicesList({ requestPermissions: 'yes' })

  // @ts-expect-error invalid constraints
  useDevicesList({ constraints: 'audio' })

  useDevicesList({
    // @ts-expect-error incompatible onUpdated
    onUpdated: (devices: string[]) => {
      void devices
    },
  })

  // @ts-expect-error arbitrary options are rejected
  useDevicesList({ once: true })
}
