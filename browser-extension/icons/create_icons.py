#!/usr/bin/env python3
"""
Create simple PNG icons without external dependencies
Uses pypng or falls back to minimal PNG creation
"""

def create_simple_png(size, filename):
    """Create a simple colored square PNG file"""
    # RGB color #667eea converted to RGB
    r, g, b = 102, 126, 234

    try:
        import png
        # Create simple colored square
        rows = []
        for y in range(size):
            row = []
            for x in range(size):
                # Add shield shape logic
                center_x, center_y = size // 2, size // 2
                dist = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
                if dist < size // 3:
                    row.extend([255, 255, 255])  # White center
                else:
                    row.extend([r, g, b])  # Blue background
            rows.append(row)

        with open(filename, 'wb') as f:
            w = png.Writer(size, size, greyscale=False)
            w.write(f, rows)
        print(f"Created {filename}")
        return True
    except ImportError:
        # Create minimal valid PNG manually
        import struct
        import zlib

        # Create image data (all pixels same color)
        img_data = b''
        for y in range(size):
            img_data += b'\x00'  # Filter type
            for x in range(size):
                img_data += bytes([r, g, b])

        # Compress image data
        compressed = zlib.compress(img_data, 9)

        # PNG signature
        png_data = b'\x89PNG\r\n\x1a\n'

        # IHDR chunk
        ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
        png_data += struct.pack('>I', 13)
        png_data += b'IHDR' + ihdr
        png_data += struct.pack('>I', zlib.crc32(b'IHDR' + ihdr) & 0xffffffff)

        # IDAT chunk
        png_data += struct.pack('>I', len(compressed))
        png_data += b'IDAT' + compressed
        png_data += struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)

        # IEND chunk
        png_data += struct.pack('>I', 0)
        png_data += b'IEND'
        png_data += struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)

        with open(filename, 'wb') as f:
            f.write(png_data)
        print(f"Created {filename} (minimal PNG)")
        return True

if __name__ == '__main__':
    create_simple_png(16, 'icon16.png')
    create_simple_png(48, 'icon48.png')
    create_simple_png(128, 'icon128.png')
    print("All icons created successfully!")
