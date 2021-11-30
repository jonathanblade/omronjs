import * as ref from "ref-napi";
import * as usb from "usb";

import libomron from "./libomron";
import * as errors from "./errors";

export interface OmronMeasurement {
  /** Systolic blood pressure */
  sys: number;
  /** Diastolic blood pressure */
  dia: number;
  /** Pulse rate */
  pul: number;
  /** Time when the measurement was made */
  measuredAt: Date;
}

export class OmronDevice {
  private _vid;
  private _pid;
  private _device;
  private _isOpen;
  private _isPlugged;

  constructor() {
    this._vid = 0x0590;
    this._pid = 0x0028;
    this._device = null;
    this._isOpen = false;
    this._isPlugged = this._detectIsPlugged();
    usb.on("attach", this._onAttach);
    usb.on("detach", this._onDetach);
  }

  /** Device vendor ID (default: 0x0590) */
  get VID(): number {
    return this._vid;
  }
  set VID(vid: number) {
    this._vid = vid;
  }

  /** Device product ID (default: 0x0028) */
  get PID(): number {
    return this._pid;
  }
  set PID(pid: number) {
    this._pid = pid;
  }

  /** Device open status */
  get isOpen(): boolean {
    return this._isOpen;
  }

  /** Device plug status */
  get isPlugged(): boolean {
    return this._isPlugged;
  }

  /** Open device */
  open = async (): Promise<void> => {
    const createDevice = new Promise<void>((resolve, reject) => {
      try {
        if (this._device === null) this._device = libomron.omron_create();
        resolve();
      } catch (err) {
        reject(errors.createDeviceError);
      }
    });
    const openDevice = new Promise<void>((resolve, reject) => {
      try {
        if (!this._isOpen) {
          const ret = libomron.omron_open(this._device, this._vid, this._pid, 0);
          if (ret < 0) reject(errors.openDeviceError);
          this._isOpen = true;
        }
        resolve();
      } catch (err) {
        reject(errors.openDeviceError);
      }
    });
    return createDevice.then(() => openDevice);
  };

  /** Close device */
  close = async (): Promise<void> => {
    const closeDevice = new Promise<void>((resolve, reject) => {
      try {
        if (this._isOpen) {
          const ret = libomron.omron_close(this._device);
          if (ret < 0) reject(errors.closeDeviceError);
          this._isOpen = false;
        }
        resolve();
      } catch (err) {
        reject(errors.closeDeviceError);
      }
    });
    const deleteDevice = new Promise<void>((resolve, reject) => {
      try {
        if (this._device !== null) {
          libomron.omron_delete(this._device);
          this._device = null;
        }
        resolve();
      } catch (err) {
        reject(errors.deleteDeviceError);
      }
    });
    return closeDevice.then(() => deleteDevice);
  };

  /**
   * Get device version
   * @returns Device version
   */
  getVersion = async (): Promise<string> => {
    const getDeviceVersion = new Promise<string>((resolve, reject) => {
      try {
        const buffer = Buffer.alloc(30 * ref.types.uchar.size).fill(0);
        // @ts-ignore
        const ret = libomron.omron_get_device_version(this._device, buffer);
        if (ret < 0) reject(errors.getDeviceVersionError);
        const version = buffer.toString();
        resolve(version);
      } catch (err) {
        reject(errors.getDeviceVersionError);
      }
    });
    return this._ensureDeviceIsOpen().then(() => getDeviceVersion);
  };

  private _getMeasurementByIndex = async (index: number): Promise<OmronMeasurement> => {
    return new Promise<OmronMeasurement>((resolve, reject) => {
      try {
        const data = libomron.omron_get_daily_bp_data(this._device, 0, index);
        if (!data.present) reject(errors.getDeviceMeasurementError);
        const measurement = {
          sys: data.sys,
          dia: data.dia,
          pul: data.pulse,
          measuredAt: new Date(2000 + data.year, data.month - 1, data.day, data.hour, data.minute, data.second),
        } as OmronMeasurement;
        resolve(measurement);
      } catch (err) {
        reject(errors.getDeviceMeasurementError);
      }
    });
  };

  private _ensureDeviceIsOpen = async (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (!this._isOpen) {
        reject(errors.deviceIsClosedError);
      } else {
        resolve();
      }
    });
  };

  private _isOmronDevice = (device: usb.Device): boolean => {
    const pid = device.deviceDescriptor.idProduct;
    const vid = device.deviceDescriptor.idVendor;
    if (pid === parseInt(this._pid.toString(), 10) && vid === parseInt(this._vid.toString(), 10)) return true;
    return false;
  };

  private _onAttach = (device: usb.Device): void => {
    if (this._isOmronDevice(device)) {
      this._isPlugged = true;
    }
  };

  private _onDetach = (device: usb.Device): void => {
    if (this._isOmronDevice(device)) {
      this._device = null;
      this._isOpen = false;
      this._isPlugged = false;
    }
  };

  private _detectIsPlugged = (): boolean => {
    const devices = usb.getDeviceList();
    for (const device of devices) if (this._isOmronDevice(device)) return true;
    return false;
  };

  /**
   * Get last measurement
   * @returns Most recent device measurement
   */
  getLastMeasurement = async (): Promise<OmronMeasurement> => {
    return this._ensureDeviceIsOpen().then(() => this._getMeasurementByIndex(0));
  };
}
