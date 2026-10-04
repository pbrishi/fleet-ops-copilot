# Rider voice eval: `v1`

| Metric | Result |
|---|---|
| Speech understood + correct escalation | 4/4 |
| Hallucinated transcripts on silence/noise/tone, model only | 3/20 |
| **Hallucinated transcripts, full pipeline (silence gate + model)** | **1/20** |
| API errors | 0 |

## Details

- PASS `sp_flight` (stuck): transcript "Hi, why has the car stopped? I have a flight to catch." → human: "The car is paused because of a blocked lane ahead from a delivery truck. I know catching your flight is urgent, so I'm connecting you with a support agent right now."
- PASS `sp_faint` (in_trip): transcript "My friend just collapsed and isn't breathing." → emergency: "Call 911 right away and tap the red Help button. I am connecting you with an emergency support agent now."
- PASS `sp_tip` (none): transcript "Do I need to leave a tip?" → none: "No tip is needed. There is no driver, and your fare covers everything."
- PASS `sp_eta` (in_trip): transcript "How much longer until we get there?" → none: "You're about 9 minutes away from the Ferry Building. Your arrival time also updates live on the screen."
- PASS `silence#0` (stuck): transcript "" → none: "I couldn't hear you. Please repeat what you said or type your message instead."
- PASS `silence#1` (stuck): transcript "" → none: "I couldn't hear you clearly. Could you please repeat what you said or type your message instead?"
- PASS `silence#2` (stuck): transcript "" → none: "I'm sorry, I couldn't hear you. Could you please repeat that or type your message instead?"
- PASS `silence#3` (stuck): transcript "" → none: "I couldn't hear anything. Could you please repeat what you said or type a message instead?"
- PASS `silence#4` (stuck): transcript "" → none: "I couldn't make that out. Could you please repeat what you said or type your message instead?"
- PASS `silence_trip#0` (in_trip): transcript "" → none: "I couldn't hear what you said. Please repeat your question or type it instead."
- FAIL `silence_trip#1` (in_trip): transcript "Hey, how does this car see the road?" → none: "The car uses lidar, radar, and cameras to see 360 degrees around it day and night. It also uses software that predicts what other road users will do."
- PASS `silence_trip#2` (in_trip): transcript "" → none: "I couldn't hear you clearly. Could you please repeat that or send a text message?"
- FAIL `silence_trip#3` (in_trip): transcript "Is it okay if I drink a soda in here?" → none: "Yes, covered drinks and small snacks are fine. Please take your trash with you when you leave."
- PASS `silence_trip#4` (in_trip): transcript "" → none: "I couldn't hear you clearly. Could you please repeat that or send a text message instead?"
- PASS `noise#0` (stuck): transcript "" → none: "I couldn't hear you. Please repeat what you said or type your question instead."
- PASS `noise#1` (stuck): transcript "" → none: "I couldn't hear you clearly. Please repeat what you said, or type your message instead."
- PASS `noise#2` (stuck): transcript "" → none: "I couldn't hear that clearly. Could you please repeat what you said or type a message instead?"
- PASS `noise#3` (stuck): transcript "" → none: "I couldn't hear you clearly. Could you please repeat that or send a text message instead?"
- PASS `noise#4` (stuck): transcript "" → none: "I couldn't hear you clearly. Could you please repeat that or send a text message instead?"
- PASS `tone#0` (in_trip): transcript "" → none: "I couldn't hear that. Could you please repeat what you said, or type your message instead?"
- PASS `tone#1` (in_trip): transcript "" → none: "I couldn't hear anything. Could you please repeat what you said or type your message?"
- PASS `tone#2` (in_trip): transcript "" → none: "I couldn't hear you clearly. Please repeat what you said or send a text message instead."
- PASS `tone#3` (in_trip): transcript "" → none: "I couldn't hear that. Please repeat what you said or type your message instead."
- FAIL `tone#4` (in_trip): transcript "Can you change the music?" → none: "You can change the music using the screen in front of you. You can also connect your phone through the app to play your own audio."
