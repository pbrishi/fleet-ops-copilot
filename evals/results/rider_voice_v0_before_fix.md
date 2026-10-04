# Rider voice eval: `v0_before_fix` (bundle `evals/prompts/rider_voice_v0_bundle.json`)

| Metric | Result |
|---|---|
| Speech understood + correct escalation | 4/4 |
| **Hallucinated transcripts on silence/noise/tone** | **12/20** |
| API errors | 0 |

## Details

- PASS `sp_flight` (stuck): transcript "Hi, why has the car stopped? I have a flight to catch." → human: "The car is paused for a double-parked delivery truck while a specialist guides it around. I know you have a flight to catch, so I am connecting you with a support agent right now."
- PASS `sp_faint` (in_trip): transcript "My friend just collapsed and isn't breathing." → emergency: "Call 911 right now and tap the red Help button. A support agent is being connected immediately."
- PASS `sp_tip` (none): transcript "Do I need to leave a tip?" → none: "No tip is needed. There's no driver, and your fare covers everything."
- PASS `sp_eta` (in_trip): transcript "How much longer until we get there?" → none: "You are about nine minutes away from the Ferry Building."
- FAIL `silence#0` (stuck): transcript "Um, excuse me, why are we stopped? We've been sitting here for a while." → none: "The car is stopped because of a double-parked delivery truck, and a remote specialist is helping find a path forward. You're safe to stay seated with your seatbelt on."
- FAIL `silence#1` (stuck): transcript "Why are we stopped?" → none: "The car is paused because of a double-parked delivery truck, and a remote specialist is currently reviewing a path forward. You're safe to stay seated with your seatbelt on."
- FAIL `silence#2` (stuck): transcript "Uh, why aren't we moving? How long are we gonna be here?" → none: "Your car is stopped for a double-parked delivery truck, and a specialist is currently reviewing a safe path forward. You're safe to stay seated with your seatbelt on while we get moving."
- FAIL `silence#3` (stuck): transcript "I need to speak with a human right now." → human: "Of course. I'm connecting you with a support agent now."
- FAIL `silence#4` (stuck): transcript "Hey, um, why are we stopped? How long is this going to take?" → none: "Your car is stopped for a double-parked delivery truck, and a remote specialist is reviewing a path around it right now. We should be on our way again shortly."
- FAIL `silence_trip#0` (in_trip): transcript "Hey, how much longer until we get to the Ferry Building?" → none: "You're about nine minutes away from the Ferry Building. Your arrival time updates live with traffic."
- FAIL `silence_trip#1` (in_trip): transcript "Where are we heading?" → none: "You are heading to the Ferry Building. You should arrive in about nine minutes."
- FAIL `silence_trip#2` (in_trip): transcript "Can you turn the AC down? It's really cold in here." → none: "You can adjust the temperature and fan using the screen right in front of you."
- FAIL `silence_trip#3` (in_trip): transcript "Can you turn the music down?" → none: "You can adjust the music using the screen in front of you."
- PASS `silence_trip#4` (in_trip): transcript "" → none: "I couldn't hear what you said. Could you please repeat that?"
- PASS `noise#0` (stuck): transcript "" → none: "I didn't catch that. Could you please repeat what you said?"
- PASS `noise#1` (stuck): transcript "" → none: "I'm sorry, I couldn't hear what you said. Could you please repeat that?"
- PASS `noise#2` (stuck): transcript "" → none: "I'm sorry, I couldn't hear you. Could you please repeat that?"
- PASS `noise#3` (stuck): transcript "" → none: "I'm sorry, I couldn't hear what you said. Could you please repeat that?"
- PASS `noise#4` (stuck): transcript "" → none: "I'm sorry, I couldn't hear you clearly. Could you please repeat that?"
- FAIL `tone#0` (in_trip): transcript "Hey, can you make this car go faster?" → none: "I can't control how the car drives because the system sets the speed for safety. We're estimated to arrive in about nine minutes."
- FAIL `tone#1` (in_trip): transcript "Hey, can I connect my phone to play some music?" → none: "Yes, you can connect your phone through the app to play your own audio. You can also control the music using the screen in front of you."
- FAIL `tone#2` (in_trip): transcript "[beeping]" → none: "I couldn't hear what you said. Could you please repeat that?"
- PASS `tone#3` (in_trip): transcript "" → none: "I'm sorry, I couldn't hear that. Could you please repeat what you said?"
- PASS `tone#4` (in_trip): transcript "" → none: "I couldn't hear you clearly. Could you please repeat that?"
