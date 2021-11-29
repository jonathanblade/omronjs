import * as ref from "ref-napi";

import libomron from "./libomron";

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

  constructor() {
    this._vid = 0x0590;
    this._pid = 0x0028;
    this._device = libomron.omron_create();
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

  /** Open device */
  open = (): Promise<void> => {
    const openDeviceError = new Error("Cannot open device");
    return new Promise<void>((resolve, reject) => {
      try {
        const ret = libomron.omron_open(this._device, this._vid, this._pid, 0);
        if (ret < 0) {
          reject(openDeviceError);
        } else {
          resolve();
        }
      } catch (err) {
        reject(openDeviceError);
      }
    });
  };

  /** Close device */
  close = (): Promise<void> => {
    const closeDeviceError = new Error("Cannot close device");
    return new Promise<void>((resolve, reject) => {
      try {
        const ret = libomron.omron_close(this._device);
        if (ret < 0) {
          reject(closeDeviceError);
        } else {
          resolve();
        }
      } catch (err) {
        reject(closeDeviceError);
      }
    });
  };

  /**
   * Get device version
   * @returns Device version
   */
  getVersion = (): Promise<string> => {
    const getVersionError = new Error("Cannot get device version");
    return new Promise<string>((resolve, reject) => {
      try {
        const buffer = Buffer.alloc(30 * ref.types.uchar.size).fill(0);
        // @ts-ignore
        const ret = libomron.omron_get_device_version(this._device, buffer);
        if (ret < 0) {
          reject(getVersionError);
        } else {
          const version = buffer.toString();
          resolve(version);
        }
      } catch (err) {
        reject(getVersionError);
      }
    });
  };

  private _getMeasurementByIndex = (index: number): Promise<OmronMeasurement> => {
    const getMeasurementError = new Error("Cannot get device measurement");
    return new Promise<OmronMeasurement>((resolve, reject) => {
      try {
        const data = libomron.omron_get_daily_bp_data(this._device, 0, index);
        if (!data.present) {
          reject(getMeasurementError);
        } else {
          const measurement = {
            sys: data.sys,
            dia: data.dia,
            pul: data.pulse,
            measuredAt: new Date(2000 + data.year, data.month - 1, data.day, data.hour, data.minute, data.second),
          } as OmronMeasurement;
          resolve(measurement);
        }
      } catch (err) {
        reject(getMeasurementError);
      }
    });
  };

  /**
   * Get last measurement
   * @returns Most recent device measurement
   */
  getLastMeasurement = async (): Promise<OmronMeasurement> => {
    return await this._getMeasurementByIndex(0);
  };
}
