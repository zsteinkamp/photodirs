import './VideoIcon.css'

export default function VideoIcon(props) {
  return (
    <div className='videoIcon'>
      <svg
        version='1.1'
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 256 256'
      >
        <g
          style={{
            stroke: 'none',
            strokeWidth: 0,
            strokeDasharray: 'none',
            strokeLinecap: 'butt',
            strokeLinejoin: 'miter',
            strokeMiterlimit: 10,
            fill: 'none',
            fillRule: 'nonzero',
            opacity: 1,
          }}
          transform='translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)'
        >
          <path
            d='M 45 0 C 20.147 0 0 20.147 0 45 c 0 24.853 20.147 45 45 45 s 45 -20.147 45 -45 C 90 20.147 69.853 0 45 0 z M 62.251 46.633 L 37.789 60.756 c -1.258 0.726 -2.829 -0.181 -2.829 -1.633 V 30.877 c 0 -1.452 1.572 -2.36 2.829 -1.634 l 24.461 14.123 C 63.508 44.092 63.508 45.907 62.251 46.633 z'
            style={{
              stroke: 'none',
              strokeWidth: 1,
              strokeDasharray: 'none',
              strokeLinecap: 'butt',
              strokeLinejoin: 'miter',
              strokeMiterlimit: 10,
              fillRule: 'nonzero',
              opacity: 1,
            }}
            transform=' matrix(1 0 0 1 0 0) '
            strokeLinecap='round'
          />
        </g>
      </svg>
    </div>
  )
}
