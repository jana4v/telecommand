package ingest

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mainframe/tm-system/internal/models"
)

// ParseUMACSSMONFrame parses a raw WebSocket JSON message from the UMACS
// real-time SMON interface and returns normalized param+value pairs.
// Each value arrives as "<state>:<epoch_ms>"; only the portion before the
// first ":" is kept (mirrors ParseSCOSPacket's trimming).
//
// Mnemonics and values are uppercased and trimmed so Redis keys/values match
// the UDTM catalog convention (uppercase) across all chain types.
func ParseUMACSSMONFrame(msg []byte) (params []ParamValue, err error) {
	var pkt models.UmacsSmonResponse
	if err = json.Unmarshal(msg, &pkt); err != nil {
		return nil, fmt.Errorf("unmarshal UmacsSmonResponse: %w", err)
	}

	params = make([]ParamValue, 0, len(pkt.Params))
	for _, p := range pkt.Params {
		name := strings.ToUpper(strings.TrimSpace(p.Mnemonic))
		if name == "" {
			continue
		}
		val, _, _ := strings.Cut(strings.TrimSpace(p.Value), ":")
		val = strings.ToUpper(val)
		params = append(params, ParamValue{Param: name, Value: val})
	}

	return params, nil
}
