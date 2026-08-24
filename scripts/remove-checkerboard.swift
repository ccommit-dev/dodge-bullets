import AppKit
import Foundation

guard CommandLine.arguments.count == 3 else {
  fputs("usage: remove-checkerboard.swift input.png output.png\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let image = NSImage(contentsOf: inputURL),
      let source = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  fputs("failed to read input image\n", stderr)
  exit(1)
}

let width = source.width
let height = source.height
let bytesPerRow = width * 4
var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
  data: &pixels,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: bytesPerRow,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
  fputs("failed to create bitmap context\n", stderr)
  exit(1)
}

context.draw(source, in: CGRect(x: 0, y: 0, width: width, height: height))

// 생성기가 칠한 두 밝은 무채색 체크 배경만 제거한다. 캐릭터의 채색과
// 윤곽선은 보존하고, 가장자리의 거의 흰 중성 픽셀은 부드러운 알파로 바꾼다.
for y in 0..<height {
  for x in 0..<width {
    let i = y * bytesPerRow + x * 4
    let r = Int(pixels[i])
    let g = Int(pixels[i + 1])
    let b = Int(pixels[i + 2])
    let hi = max(r, max(g, b))
    let lo = min(r, min(g, b))
    let neutral = hi - lo

    if neutral <= 3 && lo >= 238 {
      pixels[i + 3] = 0
      pixels[i] = 0
      pixels[i + 1] = 0
      pixels[i + 2] = 0
    } else if neutral <= 5 && lo >= 224 {
      let alpha = UInt8(max(0, min(255, (238 - lo) * 18)))
      pixels[i + 3] = alpha
    }
  }
}

guard let output = context.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, "public.png" as CFString, 1, nil) else {
  fputs("failed to create output image\n", stderr)
  exit(1)
}
CGImageDestinationAddImage(destination, output, nil)
guard CGImageDestinationFinalize(destination) else {
  fputs("failed to write output image\n", stderr)
  exit(1)
}
