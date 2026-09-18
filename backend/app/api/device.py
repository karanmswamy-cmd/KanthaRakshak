from fastapi import APIRouter
from app.schemas.sensor import DeviceStatus
from app.services.ble_service import ble_service

router = APIRouter(prefix="/device", tags=["Device & BLE"])

@router.get("/status", response_model=DeviceStatus)
def get_device_status():
    return ble_service.get_status()

@router.post("/connect")
async def connect_device():
    res = await ble_service.connect()
    return res

@router.post("/disconnect")
async def disconnect_device():
    res = await ble_service.disconnect()
    return res

@router.post("/self-test")
async def run_device_self_test():
    res = await ble_service.run_self_test()
    return res
