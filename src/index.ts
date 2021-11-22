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
    return new Promise<void>((resolve, reject) => {
      const ret = libomron.omron_open(this._device, this._vid, this._pid, 0);
      if (ret < 0) {
        const err = new Error("Cannot open device");
        reject(err);
      } else {
        resolve();
      }
    });
  };

  /** Close device */
  close = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const ret = libomron.omron_close(this._device);
      if (ret < 0) {
        const err = new Error("Cannot close device");
        reject(err);
      } else {
        resolve();
      }
    });
  };

  /**
   * Get device version
   * @returns Device version
   */
  getVersion = (): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const buffer = Buffer.alloc(30 * ref.types.uchar.size).fill(0);
      // @ts-ignore
      const ret = libomron.omron_get_device_version(this._device, buffer);
      if (ret < 0) {
        const err = new Error("Cannot get device version");
        reject(err);
      } else {
        const version = buffer.toString();
        resolve(version);
      }
    });
  };

  private _getMeasurementByIndex = (index: number): Promise<OmronMeasurement> => {
    return new Promise<OmronMeasurement>((resolve, reject) => {
      const data = libomron.omron_get_daily_bp_data(this._device, 0, index);
      if (!data.present) {
        const err = new Error(`Measurement with index=${index} is not present`);
        reject(err);
      } else {
        const measurement = {
          sys: data.sys,
          dia: data.dia,
          pul: data.pulse,
          measuredAt: new Date(2000 + data.year, data.month - 1, data.day, data.hour, data.minute, data.second),
        } as OmronMeasurement;
        resolve(measurement);
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
