#import "RNSketchCanvasManager.h"
#import "RNSketchCanvas.h"
#import "RNSketchData.h"
#import <React/RCTEventDispatcher.h>
#import <React/RCTView.h>
#import <React/UIView+React.h>
#import "Utility.h"

@implementation RNSketchCanvas
{
    RCTEventDispatcher *_eventDispatcher;
    NSMutableArray *_paths;
    RNSketchData *_currentPath;

    CGSize _lastSize;

    CGContextRef _drawingContext, _translucentDrawingContext;
    CGImageRef _frozenImage, _translucentFrozenImage;
    BOOL _needsFullRedraw;

    UIImage *_backgroundImage;
    UIImage *_backgroundImageScaled;
    NSString *_backgroundImageContentMode;
    
    NSArray *_arrTextOnSketch, *_arrSketchOnText;
    NSMutableArray<CanvasImage*> *_arrImages;
}

- (instancetype)initWithEventDispatcher:(RCTEventDispatcher *)eventDispatcher
{
    self = [super init];
    if (self) {
        _eventDispatcher = eventDispatcher;
        _paths = [NSMutableArray new];
        _needsFullRedraw = YES;
        //self.autoresizingMask = UIViewAutoresizingFlexibleHeight | UIViewAutoresizingFlexibleWidth;

        self.backgroundColor = [UIColor clearColor];
        self.clearsContextBeforeDrawing = YES;
    }
    return self;
}

- (void)drawRect:(CGRect)rect {
    CGContextRef context = UIGraphicsGetCurrentContext();

    CGRect bounds = self.bounds;

    if (_needsFullRedraw) {
        [self setFrozenImageNeedsUpdate];
        CGContextClearRect(_drawingContext, bounds);
        [NSThread sleepForTimeInterval:0.010f];
        for (RNSketchData *path in _paths) {
            [path drawInContext:_drawingContext];
        }
        _needsFullRedraw = NO;
    }

    if (!_frozenImage) {
        _frozenImage = CGBitmapContextCreateImage(_drawingContext);
    }
    
//    if (!_translucentFrozenImage && _currentPath.isTranslucent) {
//        _translucentFrozenImage = CGBitmapContextCreateImage(_translucentDrawingContext);
//    }

    if (_backgroundImage) {
        if (!_backgroundImageScaled) {
            _backgroundImageScaled = [self scaleImage:_backgroundImage toSize:bounds.size contentMode: _backgroundImageContentMode];
        }

        [_backgroundImageScaled drawInRect:bounds];
    }

    for (CanvasImage *cImg in _arrImages) {
        UIImage *img = [self scaleImage:cImg.image toSize:cImg.drawRect.size contentMode: _backgroundImageContentMode];
        [img drawInRect:cImg.drawRect];
    }
    
    for (CanvasText *text in _arrSketchOnText) {
        [text.text drawInRect: text.drawRect withAttributes: text.attribute];
    }
    
    if (_frozenImage) {
        CGContextDrawImage(context, bounds, _frozenImage);
    }

//    if (_translucentFrozenImage && _currentPath.isTranslucent) {
//        CGContextDrawImage(context, bounds, _translucentFrozenImage);
//    }
    
    for (CanvasText *text in _arrTextOnSketch) {
        [text.text drawInRect: text.drawRect withAttributes: text.attribute];
    }
}

- (void)layoutSubviews {
    [super layoutSubviews];

    if (!CGSizeEqualToSize(self.bounds.size, _lastSize)) {
        _lastSize = self.bounds.size;
        CGContextRelease(_drawingContext);
        _drawingContext = nil;
        [self createDrawingContext];
        _needsFullRedraw = YES;
        _backgroundImageScaled = nil;
        
        for (CanvasText *text in [_arrTextOnSketch arrayByAddingObjectsFromArray: _arrSketchOnText]) {
            CGPoint position = text.position;
            if (!text.isAbsoluteCoordinate) {
                position.x *= self.bounds.size.width;
                position.y *= self.bounds.size.height;
            }
            position.x -= text.drawRect.size.width * text.anchor.x;
            if (text.isRlt) {
                position.x -= text.drawRect.size.width;
            }
            position.y -= text.drawRect.size.height * text.anchor.y;
            text.drawRect = CGRectMake(position.x, position.y, text.drawRect.size.width, text.drawRect.size.height);
        }
        
        [self setNeedsDisplay];
    }
}

- (void)createDrawingContext {
    CGFloat scale = self.window.screen.scale;
    CGSize size = self.bounds.size;
    size.width *= scale;
    size.height *= scale;
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    _drawingContext = CGBitmapContextCreate(nil, size.width, size.height, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);
    //_translucentDrawingContext = CGBitmapContextCreate(nil, size.width, size.height, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);
    CGColorSpaceRelease(colorSpace);

    CGContextConcatCTM(_drawingContext, CGAffineTransformMakeScale(scale, scale));
    //CGContextConcatCTM(_translucentDrawingContext, CGAffineTransformMakeScale(scale, scale));
}

- (void)setFrozenImageNeedsUpdate {
    CGImageRelease(_frozenImage);
    CGImageRelease(_translucentFrozenImage);
    _frozenImage = nil;
    _translucentFrozenImage = nil;
}

- (BOOL)openSketchFile:(NSString *)filename directory:(NSString*) directory contentMode:(NSString*)mode {
    if (filename) {
        UIImage *image = [UIImage imageWithContentsOfFile: [directory stringByAppendingPathComponent: filename]];
        image = image ? image : [UIImage imageWithContentsOfFile: filename];
        if(image) {
            if (image.imageOrientation != UIImageOrientationUp) {
                UIGraphicsBeginImageContextWithOptions(image.size, NO, image.scale);
                [image drawInRect:(CGRect){0, 0, image.size}];
                UIImage *normalizedImage = UIGraphicsGetImageFromCurrentImageContext();
                UIGraphicsEndImageContext();
                image = normalizedImage;
            }
            _backgroundImage = image;
            _backgroundImageScaled = nil;
            _backgroundImageContentMode = mode;
            [self setNeedsDisplay];

            return YES;
        }
    }
    return NO;
}

- (void)setCanvasText:(NSArray *)aText {
    NSMutableArray *arrTextOnSketch = [NSMutableArray new];
    NSMutableArray *arrSketchOnText = [NSMutableArray new];
    NSDictionary *alignments = @{
                                 @"Left": [NSNumber numberWithInteger:NSTextAlignmentLeft],
                                 @"Center": [NSNumber numberWithInteger:NSTextAlignmentCenter],
                                 @"Right": [NSNumber numberWithInteger:NSTextAlignmentRight]
                                 };
    
    for (NSDictionary *property in aText) {
        if (property[@"text"]) {
            NSMutableArray *arr = [@"TextOnSketch" isEqualToString: property[@"overlay"]] ? arrTextOnSketch : arrSketchOnText;
            CanvasText *text = [CanvasText new];
            text.text = property[@"text"];
            UIFont *font = nil;
            if (property[@"font"]) {
                font = [UIFont fontWithName: property[@"font"] size: property[@"fontSize"] == nil ? 12 : [property[@"fontSize"] floatValue]];
                font = font == nil ? [UIFont systemFontOfSize: property[@"fontSize"] == nil ? 12 : [property[@"fontSize"] floatValue]] : font;
            } else if (property[@"fontSize"]) {
                font = [UIFont systemFontOfSize: [property[@"fontSize"] floatValue]];
            } else {
                font = [UIFont systemFontOfSize: 12];
            }
            text.font = font;
            text.anchor = property[@"anchor"] == nil ?
                CGPointMake(0, 0) :
                CGPointMake([property[@"anchor"][@"x"] floatValue], [property[@"anchor"][@"y"] floatValue]);
            text.position = property[@"position"] == nil ?
                CGPointMake(0, 0) :
                CGPointMake([property[@"position"][@"x"] floatValue], [property[@"position"][@"y"] floatValue]);
            long color = property[@"fontColor"] == nil ? 0xFF000000 : [property[@"fontColor"] longValue];
            UIColor *fontColor =
            [UIColor colorWithRed:(CGFloat)((color & 0x00FF0000) >> 16) / 0xFF
                            green:(CGFloat)((color & 0x0000FF00) >> 8) / 0xFF
                             blue:(CGFloat)((color & 0x000000FF)) / 0xFF
                            alpha:(CGFloat)((color & 0xFF000000) >> 24) / 0xFF];
            NSMutableParagraphStyle *style = [[NSParagraphStyle defaultParagraphStyle] mutableCopy];
            NSString *a = property[@"alignment"] ? property[@"alignment"] : @"Left";
            style.alignment = [alignments[a] integerValue];
            style.lineHeightMultiple = property[@"lineHeightMultiple"] ? [property[@"lineHeightMultiple"] floatValue] : 1.0;
            text.attribute = @{
                               NSFontAttributeName:font,
                               NSForegroundColorAttributeName:fontColor,
                               NSParagraphStyleAttributeName:style
                               };
            text.isAbsoluteCoordinate = ![@"Ratio" isEqualToString:property[@"coordinate"]];
            CGSize textSize = [text.text sizeWithAttributes:text.attribute];
            long width = property[@"width"] ? [property[@"width"] longValue] : -1;
            if (width > 0 && width < textSize.width) {
                textSize.height = (ceil(textSize.width/ width)+4) * textSize.height;
                textSize.width = width + 5;
            } 
            CGPoint position = text.position;
            if (!text.isAbsoluteCoordinate) {
                position.x *= self.bounds.size.width;
                position.y *= self.bounds.size.height;
            }
            position.x -= textSize.width * text.anchor.x;
            if ([property[@"rtl"] boolValue] == true) {
                text.isRlt = true;
                position.x -= textSize.width;
            } else {
                text.isRlt = false;
            }
            position.y -= textSize.height * text.anchor.y;
            text.drawRect = CGRectMake(position.x, position.y, textSize.width, textSize.height);
            [arr addObject: text];
        }
    }
    _arrTextOnSketch = [arrTextOnSketch copy];
    _arrSketchOnText = [arrSketchOnText copy];
    [self setNeedsDisplay];
}


- (void)setCanvasImagePosition:(NSDictionary *)imageOnCanvas {
    if (_arrImages == nil) {
        return; // todo error?
    }
    
    NSString * id = imageOnCanvas[@"id"];
    
    // first look for this image
    int index = -1, imgLocation = -1;
    for (CanvasImage *img in _arrImages) {
        index++;
        if (img.id == id) {
            //found
            imgLocation = index;
            break;
        }
    }
    if (imgLocation < 0) {
        return ; //todo error?
    }
    
    CanvasImage * canvasImg = _arrImages[imgLocation];
    
    canvasImg.anchor = imageOnCanvas[@"anchor"] == nil ?
        CGPointMake(0, 0) :
        CGPointMake([imageOnCanvas[@"anchor"][@"x"] floatValue], [imageOnCanvas[@"anchor"][@"y"] floatValue]);
    canvasImg.position = imageOnCanvas[@"position"] == nil ?
        CGPointMake(0, 0) :
        CGPointMake([imageOnCanvas[@"position"][@"x"] floatValue], [imageOnCanvas[@"position"][@"y"] floatValue]);

    canvasImg.width = imageOnCanvas[@"width"] ? [imageOnCanvas[@"width"] longValue] : -1;
    canvasImg.height = imageOnCanvas[@"height"] ? [imageOnCanvas[@"height"] longValue] : -1;
    canvasImg.drawRect = CGRectMake(canvasImg.position.x, canvasImg.position.y, canvasImg.width, canvasImg.height);

    [self setNeedsDisplay];
    
}

- (void)clearImages {
    _arrImages = nil;
    _needsFullRedraw = YES;
    [self setNeedsDisplay];
}


- (NSArray *)getImageIds {
    NSMutableArray *newArray = [NSMutableArray array];
    for (CanvasImage *img in _arrImages) {
        [newArray addObject:img.id];
    }
    return newArray;
}
- (NSArray *)getPathIds {
    NSMutableArray *newArray = [NSMutableArray array];
    for (RNSketchData *path in _paths) {
        NSNumber *anumber = [NSNumber numberWithInteger:path.pathId];
        [newArray addObject:anumber];
    }
    return newArray;
}

- (void)addOrSetImageOnCanvas:(NSDictionary *)imageOnCanvas {
    if (_arrImages == nil) {
        _arrImages = [NSMutableArray new];
    }
    
    NSString * id = imageOnCanvas[@"id"];
    
    // first look for this image
    int index = -1, imgLocation = -1;
    for (CanvasImage *img in _arrImages) {
        index++;
        if (img.id == id) {
            //found
            imgLocation = index;
            break;
        }
    }
    
    // convert to CanvasImage
    CanvasImage * canvasImg = [CanvasImage new];
    
    canvasImg.id = id;
    
    canvasImg.anchor = imageOnCanvas[@"anchor"] == nil ?
        CGPointMake(0, 0) :
        CGPointMake([imageOnCanvas[@"anchor"][@"x"] floatValue], [imageOnCanvas[@"anchor"][@"y"] floatValue]);
    canvasImg.position = imageOnCanvas[@"position"] == nil ?
        CGPointMake(0, 0) :
        CGPointMake([imageOnCanvas[@"position"][@"x"] floatValue], [imageOnCanvas[@"position"][@"y"] floatValue]);

    canvasImg.width = imageOnCanvas[@"width"] ? [imageOnCanvas[@"width"] longValue] : -1;
    canvasImg.height = imageOnCanvas[@"height"] ? [imageOnCanvas[@"height"] longValue] : -1;
    canvasImg.drawRect = CGRectMake(canvasImg.position.x, canvasImg.position.y, canvasImg.width, canvasImg.height);

    NSData *data = [[NSData alloc]initWithBase64EncodedString:imageOnCanvas[@"imageData"] options:NSDataBase64DecodingIgnoreUnknownCharacters];
    canvasImg.image = [UIImage imageWithData:data];
    
    if (imgLocation > -1) {
        _arrImages[imgLocation] = canvasImg;
    } else {
        [_arrImages addObject:canvasImg];
    }
    [self setNeedsDisplay];
}


- (void)newPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth {
    _currentPath = [[RNSketchData alloc]
                    initWithId: pathId
                    strokeColor: strokeColor
                    strokeWidth: strokeWidth];
    [_paths addObject: _currentPath];
}

- (void) addPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth points:(NSArray*) points {
    
    for(int i=0; i<_paths.count; i++) {
        if (((RNSketchData*)_paths[i]).pathId == pathId) {
            [self deletePath:pathId];
            break;
        }
    }
    
    RNSketchData *data = [[RNSketchData alloc] initWithId: pathId
                                              strokeColor: strokeColor
                                              strokeWidth: strokeWidth
                                                   points: points];
    [_paths addObject: data];
    [data drawInContext:_drawingContext];
    [self setFrozenImageNeedsUpdate];
    [self setNeedsDisplay];
    [self notifyPathsUpdate];
}

- (void)deletePath:(int) pathId {
    int index = -1;
    for(int i=0; i<_paths.count; i++) {
        if (((RNSketchData*)_paths[i]).pathId == pathId) {
            index = i;
            break;
        }
    }
    
    if (index > -1) {
        [_paths removeObjectAtIndex: index];
        _needsFullRedraw = YES;
        [self setNeedsDisplay];
        [self notifyPathsUpdate];
    }
}

- (void)deleteImage:(NSString*) imageId {
    int index = 0;
    for (CanvasImage *img in _arrImages) {
        
        if (img.id == imageId) {
            [_arrImages removeObjectAtIndex:index];
            break;
        }
        index++;
    }

    _arrImages = nil;
    _needsFullRedraw = YES;
    [self setNeedsDisplay];
}


- (void)addPointX: (float)x Y: (float)y {
    CGPoint newPoint = CGPointMake(x, y);
    CGRect updateRect = [_currentPath addPoint: newPoint];

//    if (_currentPath.isTranslucent) {
//        CGContextClearRect(_translucentDrawingContext, self.bounds);
//        [_currentPath drawInContext:_translucentDrawingContext];
//    } else {
        [_currentPath drawLastPointInContext:_drawingContext];
 //   }

    [self setFrozenImageNeedsUpdate];
    [self setNeedsDisplayInRect:updateRect];
}

- (void)endPath {
//    if (_currentPath.isTranslucent) {
//        [_currentPath drawInContext:_drawingContext];
//    }
    _currentPath = nil;
}

- (void) clear {
    [_paths removeAllObjects];
    _currentPath = nil;
    _needsFullRedraw = YES;
    [self setNeedsDisplay];
    [self notifyPathsUpdate];
}

- (UIImage*)createImageWithTransparentBackground: (BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize scaleToSize:(CGSize)scaleToSize {
    if (_backgroundImage && cropToImageSize) {
        CGRect rect = CGRectMake(0, 0, _backgroundImage.size.width, _backgroundImage.size.height);
        if (scaleToSize.height != 0 && scaleToSize.width != 0) {
            rect.size = scaleToSize;
        }
        UIGraphicsBeginImageContextWithOptions(rect.size, !transparent, 1);
        CGContextRef context = UIGraphicsGetCurrentContext();
        if (!transparent) {
            CGContextSetRGBFillColor(context, 1.0f, 1.0f, 1.0f, 1.0f);
            CGContextFillRect(context, rect);
        }
        CGRect targetRect = [Utility fillImageWithSize:self.bounds.size toSize:rect.size contentMode:@"AspectFill"];
        if (includeImage) {
            [_backgroundImage drawInRect:rect];
        }
        
        for (CanvasImage *cImg in _arrImages) {
            UIImage *img = [self scaleImage:cImg.image toSize:cImg.drawRect.size contentMode: _backgroundImageContentMode];
            [img drawInRect:cImg.drawRect];
        }
        
        if (includeText) {
            for (CanvasText *text in _arrSketchOnText) {
                [text.text drawInRect: text.drawRect withAttributes: text.attribute];
            }
        }
        
        CGContextDrawImage(context, targetRect, _frozenImage);
        CGContextDrawImage(context, targetRect, _translucentFrozenImage);
        
        if (includeText) {
            for (CanvasText *text in _arrTextOnSketch) {
                [text.text drawInRect: text.drawRect withAttributes: text.attribute];
            }
        }
        
        UIImage *img = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        
        return img;
    } else {
        CGRect rect = self.bounds;
        UIGraphicsBeginImageContextWithOptions(rect.size, !transparent, 0);
        CGContextRef context = UIGraphicsGetCurrentContext();
        if (!transparent) {
            CGContextSetRGBFillColor(context, 1.0f, 1.0f, 1.0f, 1.0f);
            CGContextFillRect(context, rect);
        }
        if (_backgroundImage && includeImage) {
            CGRect targetRect = [Utility fillImageWithSize:_backgroundImage.size toSize:rect.size contentMode:_backgroundImageContentMode];
            [_backgroundImage drawInRect:targetRect];
        }
        
        for (CanvasImage *cImg in _arrImages) {
            UIImage *img = [self scaleImage:cImg.image toSize:cImg.drawRect.size contentMode: _backgroundImageContentMode];
            [img drawInRect:cImg.drawRect];
        }
        
        if (includeText) {
            for (CanvasText *text in _arrSketchOnText) {
                [text.text drawInRect: text.drawRect withAttributes: text.attribute];
            }
        }
        
        CGContextDrawImage(context, rect, _frozenImage);
        CGContextDrawImage(context, rect, _translucentFrozenImage);
        
        if (includeText) {
            for (CanvasText *text in _arrTextOnSketch) {
                [text.text drawInRect: text.drawRect withAttributes: text.attribute];
            }
        }
        
        UIImage *img = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        
        return img;
    }
}

- (NSString*)saveImageOfType:(NSString*) type folder:(NSString*) folder filename:(NSString*) filename withTransparentBackground:(BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize scaleToSize:(CGSize)scaleToSize {
    UIImage *img = [self createImageWithTransparentBackground:transparent includeImage:includeImage includeText:(BOOL)includeText cropToImageSize:cropToImageSize scaleToSize:scaleToSize];
    
    if (folder != nil && filename != nil) {
        NSURL *tempDir = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES] URLByAppendingPathComponent: folder];
        NSError * error = nil;
        [[NSFileManager defaultManager] createDirectoryAtPath:[tempDir path]
                                  withIntermediateDirectories:YES
                                                   attributes:nil
                                                        error:&error];
        if (error == nil) {
            NSURL *fileURL = [[tempDir URLByAppendingPathComponent: filename] URLByAppendingPathExtension: type];
            NSData *imageData = [self getImageData:img type:type];
            if ([imageData writeToURL:fileURL atomically:YES]) {

                if (_onChange) {
                    _onChange(@{ @"success": @YES, @"path": [fileURL path]});
                }
                return fileURL.absoluteString;
            }
        }
        if (_onChange) {
            _onChange(@{ @"success": @NO, @"path": [NSNull null]});
        }
        
    } else {
        if ([type isEqualToString: @"png"]) {
            img = [UIImage imageWithData: UIImagePNGRepresentation(img)];
        }
        UIImageWriteToSavedPhotosAlbum(img, self, @selector(image:didFinishSavingWithError:contextInfo:), nil);
    }
    return @"";
}

- (UIImage *)scaleImage:(UIImage *)originalImage toSize:(CGSize)size contentMode: (NSString*)mode
{
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(NULL, size.width, size.height, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);
    CGContextClearRect(context, CGRectMake(0, 0, size.width, size.height));

    CGRect targetRect = [Utility fillImageWithSize:originalImage.size toSize:size contentMode:mode];
    CGContextDrawImage(context, targetRect, originalImage.CGImage);
    
    CGImageRef scaledImage = CGBitmapContextCreateImage(context);
    CGColorSpaceRelease(colorSpace);
    CGContextRelease(context);
    
    UIImage *image = [UIImage imageWithCGImage:scaledImage];
    CGImageRelease(scaledImage);
    
    return image;
}

- (NSString*) transferToBase64OfType: (NSString*) type withTransparentBackground: (BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize {
    UIImage *img = [self createImageWithTransparentBackground:transparent includeImage:includeImage includeText:(BOOL)includeText cropToImageSize:cropToImageSize scaleToSize:CGSizeZero];
    NSData *data = [self getImageData:img type:type];
    return [data base64EncodedStringWithOptions: NSDataBase64Encoding64CharacterLineLength];
}

- (NSData*)getImageData:(UIImage*)img type:(NSString*) type {
    NSData *data;
    if ([type isEqualToString: @"jpg"]) {
        data = UIImageJPEGRepresentation(img, 1.0);
    } else {
        data = UIImagePNGRepresentation(img);
    }
    return data;
}

- (void)image:(UIImage *)image didFinishSavingWithError:(NSError *)error contextInfo: (void *) contextInfo {
    if (_onChange) {
        _onChange(@{ @"success": error != nil ? @NO : @YES });
    }
}

- (void)notifyPathsUpdate {
    if (_onChange) {
        _onChange(@{ @"pathsUpdate": @(_paths.count) });
    }
}

@end

@implementation CanvasText
@end

@implementation CanvasImage
@end
