# Cloud Functions for Firebase — AgendMy
# Região: southamerica-east1
# Python Firebase Functions v2

from firebase_functions import firestore_fn, scheduler_fn, options
from firebase_admin import initialize_app, firestore, messaging
from datetime import datetime, timedelta, timezone
import logging

initialize_app()
options.set_global_options(region="southamerica-east1", max_instances=10)
logging.basicConfig(level=logging.INFO)


# ─── Helper: buscar tokens FCM de um usuário ─────────────────────────────────

def get_user_tokens(db, user_id: str) -> list[str]:
    """Busca tokens FCM em users/{userId}/tokens (subcoleção)."""
    tokens_ref = db.collection("users").document(user_id).collection("tokens")
    return [doc.id for doc in tokens_ref.stream()]


def send_to_user(db, user_id: str, title: str, body: str, data: dict) -> int:
    """Envia notificação push para todos os tokens de um usuário. Retorna success_count."""
    tokens = get_user_tokens(db, user_id)
    if not tokens:
        logging.info(f"Nenhum token FCM para o usuário: {user_id}")
        return 0

    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                channel_id="default",
                sound="default",
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound="default", badge=1)
            )
        ),
        data={k: str(v) for k, v in data.items()},
        tokens=tokens,
    )

    try:
        response = messaging.send_each_for_multicast(message)
        # Remover tokens inválidos automaticamente
        for idx, result in enumerate(response.responses):
            if not result.success:
                error_code = result.exception.code if result.exception else ""
                if error_code in ("messaging/invalid-registration-token",
                                  "messaging/registration-token-not-registered"):
                    invalid_token = tokens[idx]
                    db.collection("users").document(user_id).collection("tokens").document(invalid_token).delete()
                    logging.info(f"Token inválido removido: {invalid_token}")
        return response.success_count
    except Exception as e:
        logging.error(f"Erro ao enviar notificação: {e}")
        return 0


# ─── 1. Nova mensagem no chat ─────────────────────────────────────────────────

@firestore_fn.on_document_created(document="chats/{chatId}/messages/{messageId}")
def on_new_message(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """Notifica o destinatário quando uma nova mensagem é enviada no chat."""
    try:
        message_data = event.data.to_dict()
        chat_id = event.params["chatId"]
        if not message_data:
            return

        db = firestore.client()

        chat_doc = db.collection("chats").document(chat_id).get()
        if not chat_doc.exists:
            return

        chat_data = chat_doc.to_dict() or {}
        sender_id = message_data.get("senderId", "")
        participants = chat_data.get("participants", [])

        recipient_id = next((p for p in participants if p != sender_id), None)
        if not recipient_id:
            return

        # Nome do remetente
        sender_doc = db.collection("users").document(sender_id).get()
        sender_name = "Alguém"
        if sender_doc.exists:
            sender_name = (sender_doc.to_dict() or {}).get("name", "Alguém")

        msg_text = message_data.get("text", "Nova mensagem")
        if len(msg_text) > 100:
            msg_text = msg_text[:97] + "..."

        count = send_to_user(
            db=db,
            user_id=recipient_id,
            title=f"💬 {sender_name}",
            body=msg_text,
            data={"chatId": chat_id, "screen": "Chat"},
        )
        logging.info(f"Notificação de chat enviada. Sucesso: {count}")

    except Exception as e:
        logging.error(f"Erro em on_new_message: {e}")


# ─── 2. Mudança de status do agendamento ─────────────────────────────────────

@firestore_fn.on_document_updated(document="appointments/{appointmentId}")
def on_appointment_update(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]) -> None:
    """Notifica o cliente quando o status do agendamento muda."""
    try:
        before = (event.data.before.to_dict() or {})
        after = (event.data.after.to_dict() or {})
        appointment_id = event.params["appointmentId"]

        old_status = before.get("status", "")
        new_status = after.get("status", "")

        if old_status == new_status:
            return

        STATUS_MESSAGES = {
            "confirmed": ("✅ Agendamento Confirmado!", "confirmado"),
            "cancelled": ("❌ Agendamento Cancelado", "cancelado"),
            "completed": ("⭐ Atendimento Concluído", "concluído"),
            "no_show":   ("⚠️ Falta Registrada", "marcado como falta"),
        }

        if new_status not in STATUS_MESSAGES:
            return

        client_id = after.get("clientId", "")
        business_id = after.get("businessId", "")
        if not client_id or not business_id:
            return

        db = firestore.client()

        business_doc = db.collection("businesses").document(business_id).get()
        business_name = "o estabelecimento"
        if business_doc.exists:
            business_name = (business_doc.to_dict() or {}).get("name", business_name)

        title, verb = STATUS_MESSAGES[new_status]
        date_str = after.get("date", "")
        time_str = after.get("time", "")
        body = f"Seu agendamento em {business_name} ({date_str} às {time_str}) foi {verb}."

        # Notificar cliente
        count = send_to_user(
            db=db,
            user_id=client_id,
            title=title,
            body=body,
            data={"appointmentId": appointment_id, "screen": "Appointments"},
        )

        # Se cancelado pelo cliente, notificar o proprietário também
        if new_status == "cancelled":
            owner_doc = db.collection("businesses").document(business_id).get()
            if owner_doc.exists:
                owner_id = (owner_doc.to_dict() or {}).get("ownerId", "")
                client_name = after.get("clientName", "Um cliente")
                service_name = after.get("serviceName", "serviço")
                if owner_id:
                    send_to_user(
                        db=db,
                        user_id=owner_id,
                        title="❌ Agendamento Cancelado",
                        body=f"{client_name} cancelou {service_name} ({date_str} às {time_str}).",
                        data={"appointmentId": appointment_id, "screen": "AppointmentManagement"},
                    )

        logging.info(f"Notificação de status enviada para {appointment_id}. Sucesso: {count}")

    except Exception as e:
        logging.error(f"Erro em on_appointment_update: {e}")


# ─── 3. Novo agendamento criado ───────────────────────────────────────────────

@firestore_fn.on_document_created(document="appointments/{appointmentId}")
def on_appointment_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """Notifica o proprietário quando um novo agendamento é criado."""
    try:
        data = event.data.to_dict() or {}
        appointment_id = event.params["appointmentId"]

        business_id = data.get("businessId", "")
        client_name = data.get("clientName", "Um cliente")
        service_name = data.get("serviceName", "serviço")
        date_str = data.get("date", "")
        time_str = data.get("time", "")

        if not business_id:
            return

        db = firestore.client()

        business_doc = db.collection("businesses").document(business_id).get()
        if not business_doc.exists:
            return

        owner_id = (business_doc.to_dict() or {}).get("ownerId", "")
        if not owner_id:
            return

        count = send_to_user(
            db=db,
            user_id=owner_id,
            title="📅 Novo Agendamento",
            body=f"{client_name} agendou {service_name} para {date_str} às {time_str}.",
            data={"appointmentId": appointment_id, "screen": "AppointmentManagement"},
        )
        logging.info(f"Notificação de novo agendamento enviada ao owner. Sucesso: {count}")

    except Exception as e:
        logging.error(f"Erro em on_appointment_created: {e}")


# ─── 4. Lembrete automático 24h antes do agendamento ─────────────────────────

@scheduler_fn.on_schedule(schedule="every 60 minutes")
def appointment_reminder(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Roda a cada hora. Envia lembrete para agendamentos
    que ocorrem entre 23h e 25h a partir de agora.
    """
    try:
        now = datetime.now(timezone.utc)
        window_start = now + timedelta(hours=23)
        window_end = now + timedelta(hours=25)

        # Datas no formato YYYY-MM-DD para comparar com o campo 'date' do Firestore
        start_date = window_start.strftime("%Y-%m-%d")
        end_date = window_end.strftime("%Y-%m-%d")

        db = firestore.client()

        query = (
            db.collection("appointments")
            .where("status", "in", ["scheduled", "confirmed"])
            .where("reminderSent", "==", False)
            .where("date", ">=", start_date)
            .where("date", "<=", end_date)
        )

        appointments = list(query.stream())
        if not appointments:
            logging.info("Nenhum agendamento para lembrete nas próximas 24h.")
            return

        reminders_sent = 0

        for appt_doc in appointments:
            appt = appt_doc.to_dict() or {}
            appt_id = appt_doc.id

            # Verificar janela com hora exata
            appt_date = appt.get("date", "")
            appt_time = appt.get("time", "00:00")

            try:
                appt_dt = datetime.strptime(
                    f"{appt_date} {appt_time}", "%Y-%m-%d %H:%M"
                ).replace(tzinfo=timezone.utc)
            except ValueError:
                continue

            hours_until = (appt_dt - now).total_seconds() / 3600
            if not (23 <= hours_until <= 25):
                continue

            client_id = appt.get("clientId", "")
            business_id = appt.get("businessId", "")
            if not client_id:
                continue

            # Buscar nome do negócio
            business_name = "o estabelecimento"
            if business_id:
                biz_doc = db.collection("businesses").document(business_id).get()
                if biz_doc.exists:
                    business_name = (biz_doc.to_dict() or {}).get("name", business_name)

            service_name = appt.get("serviceName", "seu serviço")

            count = send_to_user(
                db=db,
                user_id=client_id,
                title="🔔 Lembrete de Agendamento",
                body=f"Não esqueça! {service_name} em {business_name} amanhã às {appt_time}.",
                data={"appointmentId": appt_id, "screen": "Appointments"},
            )

            if count > 0:
                # Marcar como enviado para não duplicar
                db.collection("appointments").document(appt_id).update(
                    {"reminderSent": True}
                )
                reminders_sent += 1

        logging.info(f"Lembretes enviados: {reminders_sent}")

    except Exception as e:
        logging.error(f"Erro em appointment_reminder: {e}")
