import React from 'react'

// Cute Penny Coin Character SVG - Shared component for Tour Guide and Chat
function PennyAvatar({ isWaving = false, isTalking = false, isThinking = false, isHappy = false, isSurprised = false, isStanding = false, isDancing = false, size = 80, id = 'main' }) {
  const gradientId = `penny-${id}`
  return (
    <svg width={size} height={size} viewBox="-10 0 120 100" className="drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
      {/* Dancing animation wrapper */}
      <g>
        {isDancing && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-8,0; 8,0; -8,0"
            dur="1.2s"
            repeatCount="indefinite"
          />
        )}
      {/* Coin body - main circle */}
      <circle cx="50" cy="50" r="44" fill={`url(#${gradientId}-coin)`} />

      {/* Coin rim/edge - outer ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="#b45309" strokeWidth="3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />

      {/* Inner decorative circle */}
      <circle cx="50" cy="50" r="36" fill="none" stroke="#92400e" strokeWidth="1" opacity="0.3" />

      {/* Coin shine/highlight */}
      <ellipse cx="35" cy="30" rx="15" ry="10" fill="rgba(255,255,255,0.3)" />
      <ellipse cx="30" cy="35" rx="8" ry="5" fill="rgba(255,255,255,0.2)" />

      {/* Lincoln-style hair silhouette at top (simplified, cute) */}
      <path d="M 35 22 Q 40 18 50 17 Q 60 18 65 22 Q 63 20 50 19 Q 37 20 35 22" fill="#92400e" opacity="0.4" />

      {/* Eyes with blinking animation */}
      <g>
        {isHappy ? (
          // Happy closed eyes (^_^) style
          <>
            <path d="M 32 42 Q 38 36 44 42" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 56 42 Q 62 36 68 42" stroke="#1f2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : isSurprised ? (
          // Surprised wide eyes with small pupils
          <>
            <ellipse cx="38" cy="42" rx="8" ry="10" fill="white" />
            <ellipse cx="62" cy="42" rx="8" ry="10" fill="white" />
            <circle cx="39" cy="43" r="3" fill="#1f2937" />
            <circle cx="63" cy="43" r="3" fill="#1f2937" />
            <circle cx="36" cy="40" r="2.5" fill="white" />
            <circle cx="60" cy="40" r="2.5" fill="white" />
            {/* Raised eyelashes for surprise */}
            <g stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" fill="none">
              <path d="M 30 36 L 26 32 M 34 32 L 33 26 M 40 33 L 43 28" />
              <path d="M 70 36 L 74 32 M 66 32 L 67 26 M 60 33 L 57 28" />
            </g>
          </>
        ) : (
          <>
            <ellipse cx="38" cy="42" rx="7" ry="8" fill="white">
              {!isTalking && !isThinking && (
                <animate attributeName="ry" values="8;8;0;8;8" keyTimes="0;0.9;0.93;0.96;1" dur="8s" repeatCount="indefinite" />
              )}
            </ellipse>
            <ellipse cx="62" cy="42" rx="7" ry="8" fill="white">
              {!isTalking && !isThinking && (
                <animate attributeName="ry" values="8;8;0;8;8" keyTimes="0;0.9;0.93;0.96;1" dur="8s" repeatCount="indefinite" />
              )}
            </ellipse>

            {/* Pupils - animate when talking, look up when thinking, blink when idle */}
            <circle cx={isTalking ? "40" : isThinking ? "41" : "39"} cy={isThinking ? "40" : "43"} r="3.5" fill="#1f2937">
              {isTalking ? (
                <animate attributeName="cx" values="39;41;39" dur="0.5s" repeatCount="indefinite" />
              ) : isThinking ? (
                <animate attributeName="cx" values="41;42;41" dur="2s" repeatCount="indefinite" />
              ) : (
                <animate attributeName="r" values="3.5;3.5;0;3.5;3.5" keyTimes="0;0.9;0.93;0.96;1" dur="8s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={isTalking ? "64" : isThinking ? "65" : "63"} cy={isThinking ? "40" : "43"} r="3.5" fill="#1f2937">
              {isTalking ? (
                <animate attributeName="cx" values="63;65;63" dur="0.5s" repeatCount="indefinite" />
              ) : isThinking ? (
                <animate attributeName="cx" values="65;66;65" dur="2s" repeatCount="indefinite" />
              ) : (
                <animate attributeName="r" values="3.5;3.5;0;3.5;3.5" keyTimes="0;0.9;0.93;0.96;1" dur="8s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Eye sparkles */}
            <circle cx={isThinking ? "38" : "36"} cy={isThinking ? "38" : "40"} r="2" fill="white">
              {!isTalking && !isThinking && (
                <animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.9;0.93;0.96;1" dur="8s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={isThinking ? "62" : "60"} cy={isThinking ? "38" : "40"} r="2" fill="white">
              {!isTalking && !isThinking && (
                <animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.9;0.93;0.96;1" dur="8s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Eyelashes */}
            <g stroke="#1f2937" strokeWidth="1.2" strokeLinecap="round" fill="none">
              <path d="M 31 38 L 28 35 M 35 34 L 34 29 M 40 35 L 42 31" />
              <path d="M 69 38 L 72 35 M 65 34 L 66 29 M 60 35 L 58 31" />
              {!isTalking && !isThinking && (
                <animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.9;0.93;0.96;1" dur="8s" repeatCount="indefinite" />
              )}
            </g>
          </>
        )}
      </g>

      {/* Thinking dots - only show when thinking */}
      {isThinking && (
        <g fill="#fbbf24">
          <circle cx="78" cy="22" r="3">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="85" cy="15" r="4">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
          </circle>
          <circle cx="93" cy="8" r="5">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
          </circle>
        </g>
      )}

      {/* Cute rosy cheeks - brighter when happy */}
      <ellipse cx="28" cy="52" rx={isHappy ? "8" : "7"} ry={isHappy ? "5" : "4"} fill="#fb7185" opacity={isHappy ? "0.9" : "0.8"} />
      <ellipse cx="72" cy="52" rx={isHappy ? "8" : "7"} ry={isHappy ? "5" : "4"} fill="#fb7185" opacity={isHappy ? "0.9" : "0.8"} />

      {/* Mouth */}
      {isTalking ? (
        <ellipse cx="50" cy="58" rx="6" ry="5" fill="#7c2d12">
          <animate attributeName="ry" values="5;7;5" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
      ) : isThinking ? (
        // Small thoughtful line when thinking
        <path d="M 45 58 Q 50 56 55 58" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : isHappy ? (
        // Big open happy smile
        <path d="M 38 55 Q 50 68 62 55" stroke="#7c2d12" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : isSurprised ? (
        // Surprised O mouth
        <ellipse cx="50" cy="60" rx="5" ry="6" fill="#7c2d12" />
      ) : (
        <path d="M 42 56 Q 50 64 58 56" stroke="#7c2d12" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {/* Small arms/hands on sides */}
      {/* Left arm - waves when isWaving is true */}
      <g transform={isWaving ? "translate(8, 35)" : "translate(8, 50)"}>
        <ellipse
          cx="0"
          cy="0"
          rx="6"
          ry="8"
          fill={`url(#${gradientId}-coin)`}
          stroke="#b45309"
          strokeWidth="1.5"
        >
          {isWaving && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="20 0 0;-20 0 0;20 0 0"
              dur="0.3s"
              repeatCount="indefinite"
            />
          )}
        </ellipse>
        {/* Waving hand fingers when waving */}
        {isWaving && (
          <g>
            <circle cx="-4" cy="-6" r="2" fill={`url(#${gradientId}-coin)`} stroke="#b45309" strokeWidth="0.5">
              <animate attributeName="cy" values="-6;-8;-6" dur="0.15s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="-8" r="2" fill={`url(#${gradientId}-coin)`} stroke="#b45309" strokeWidth="0.5">
              <animate attributeName="cy" values="-8;-10;-8" dur="0.15s" repeatCount="indefinite" begin="0.05s" />
            </circle>
            <circle cx="4" cy="-6" r="2" fill={`url(#${gradientId}-coin)`} stroke="#b45309" strokeWidth="0.5">
              <animate attributeName="cy" values="-6;-8;-6" dur="0.15s" repeatCount="indefinite" begin="0.1s" />
            </circle>
          </g>
        )}
      </g>

      {/* Right arm */}
      <ellipse
        cx="92"
        cy="50"
        rx="6"
        ry="8"
        fill={`url(#${gradientId}-coin)`}
        stroke="#b45309"
        strokeWidth="1.5"
      />

      {/* Little feet at bottom - lift up when standing, alternate when dancing */}
      <ellipse
        cx="38"
        cy={isStanding ? "88" : "92"}
        rx={isStanding ? "6" : "8"}
        ry={isStanding ? "4" : "5"}
        fill={`url(#${gradientId}-coin)`}
        stroke="#b45309"
        strokeWidth="1.5"
      >
        {isStanding && (
          <animate attributeName="cy" values="92;88" dur="0.3s" fill="freeze" />
        )}
        {isDancing && (
          <animate attributeName="cy" values="92;88;92" dur="0.3s" repeatCount="indefinite" />
        )}
      </ellipse>
      <ellipse
        cx="62"
        cy={isStanding ? "88" : "92"}
        rx={isStanding ? "6" : "8"}
        ry={isStanding ? "4" : "5"}
        fill={`url(#${gradientId}-coin)`}
        stroke="#b45309"
        strokeWidth="1.5"
      >
        {isStanding && (
          <animate attributeName="cy" values="92;88" dur="0.3s" fill="freeze" />
        )}
        {isDancing && (
          <animate attributeName="cy" values="88;92;88" dur="0.3s" repeatCount="indefinite" />
        )}
      </ellipse>

      {/* Legs when standing */}
      {isStanding && (
        <>
          <rect x="35" y="80" width="6" height="8" rx="2" fill={`url(#${gradientId}-coin)`} stroke="#b45309" strokeWidth="1">
            <animate attributeName="height" values="0;8" dur="0.3s" fill="freeze" />
          </rect>
          <rect x="59" y="80" width="6" height="8" rx="2" fill={`url(#${gradientId}-coin)`} stroke="#b45309" strokeWidth="1">
            <animate attributeName="height" values="0;8" dur="0.3s" fill="freeze" />
          </rect>
        </>
      )}

      {/* Cent symbol */}
      <text x="50" y="85" textAnchor="middle" fill="#7c2d12" fontSize="22" fontWeight="bold">&#162;</text>
      </g>

      {/* Gradients */}
      <defs>
        <radialGradient id={`${gradientId}-coin`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export default PennyAvatar
